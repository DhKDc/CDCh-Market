-- Diecast Chile Market — esquema de base de datos para Supabase
-- Ejecutar completo en el SQL Editor de tu proyecto Supabase.
--
-- IMPORTANTE (registro sin correo real): en Supabase Dashboard ve a
-- Authentication → Providers → Email y DESACTIVA "Confirm email". El
-- registro de esta app usa un correo sintético interno (nadie lo ve ni lo
-- recibe), así que si dejas la confirmación activada nadie podrá crear
-- cuenta (Supabase esperaría un clic en un correo que nunca llega).

create type post_type as enum ('VENTA','PERMUTA','AMBOS','BUSCO');
create type post_status as enum ('ACTIVA','VENDIDO');
create type profile_status as enum ('PENDIENTE','APROBADO','RECHAZADO');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  phone text,
  status profile_status not null default 'PENDIENTE',
  is_official boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type post_type not null,
  title text not null,
  description text,
  price numeric,
  trade_for text,
  photo_urls text[] not null default '{}',
  status post_status not null default 'ACTIVA',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Crea automáticamente un perfil cuando alguien se registra. El registro es
-- solo con username + teléfono + contraseña (sin correo real) — el "email"
-- que llega aquí es un correo sintético armado a partir del username
-- (ver lib/config.ts), así que el username real se manda en raw_user_meta_data.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
      new.raw_user_meta_data ->> 'phone'
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Evita que alguien se autoapruebe: solo un admin puede cambiar status,
-- is_admin o is_official; cualquier otro cambio (username, phone) sí lo
-- puede hacer el propio dueño del perfil.
create or replace function protect_profile_fields() returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    new.status := old.status;
    new.is_admin := old.is_admin;
    new.is_official := old.is_official;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_protect_profile_fields
  before update on profiles
  for each row execute function protect_profile_fields();

-- Reglas de la comunidad, aplicadas al crear una publicación:
--  * VENTA requiere precio y respeta el máx. de 3 al día, salvo cuentas
--    marcadas is_official (tiendas oficiales o admins del GRUPO de WhatsApp).
--    OJO: is_official es independiente de is_admin (el admin del SITIO, que
--    modera publicaciones). Ser admin del sitio no exime del límite de venta
--    por sí solo; si esa persona también debe estar exenta, márcala además
--    como is_official.
--  * PERMUTA requiere indicar qué se busca a cambio
create or replace function public.check_post_rules() returns trigger as $$
declare
  es_oficial boolean;
  estado_perfil public.profile_status;
  ventas_24h int;
  es_venta boolean;
  es_permuta boolean;
begin
  es_venta := new.type in ('VENTA', 'AMBOS');
  es_permuta := new.type in ('PERMUTA', 'AMBOS');

  select is_official, status into es_oficial, estado_perfil
    from public.profiles where id = new.user_id;

  if estado_perfil is distinct from 'APROBADO' then
    raise exception 'Tu cuenta debe ser aprobada por un administrador antes de publicar';
  end if;

  if es_venta and new.price is null and not coalesce(es_oficial, false) then
    raise exception 'El precio es obligatorio para las ventas';
  end if;

  if es_venta and not coalesce(es_oficial, false) then
    select count(*) into ventas_24h from public.posts
      where user_id = new.user_id
        and type in ('VENTA', 'AMBOS')
        and created_at > now() - interval '24 hours';
    if ventas_24h >= 3 then
      raise exception 'Máximo 3 ventas por día (las permutas y búsquedas no tienen límite)';
    end if;
  end if;

  if es_permuta and (new.trade_for is null or new.trade_for = '') then
    raise exception 'Debes indicar qué buscas a cambio en una permuta';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_check_post_rules
  before insert on posts
  for each row execute function check_post_rules();

-- Row Level Security
alter table profiles enable row level security;
alter table posts enable row level security;

create policy "perfiles visibles para todos" on profiles
  for select using (true);
create policy "cada quien edita su perfil" on profiles
  for update using (auth.uid() = id);
create policy "el admin del sitio edita cualquier perfil" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );
-- Nota: el trigger trg_protect_profile_fields (arriba) es lo que realmente
-- impide que alguien cambie su propio status/is_admin/is_official; estas
-- policies solo permiten el UPDATE en general (dueño, o admin sobre cualquiera).

create policy "publicaciones activas visibles para todos, propias y admin ve todo"
  on posts for select
  using (
    (status = 'ACTIVA' and expires_at > now())
    or user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
create policy "solo el dueño crea sus publicaciones" on posts
  for insert with check (auth.uid() = user_id);
create policy "el dueño o el admin del sitio editan la publicacion" on posts
  for update using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
create policy "el dueño o el admin del sitio eliminan la publicacion" on posts
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- Novedades y anuncios (los suben los admins del sitio).
do $$ begin
  create type public.announcement_kind as enum ('NOVEDAD', 'PROXIMAMENTE', 'PREVENTA', 'RIFA');
exception when duplicate_object then null; end $$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind public.announcement_kind not null default 'NOVEDAD',
  title text not null,
  body text,
  photo_urls text[] not null default '{}',
  event_date date,
  created_at timestamptz not null default now()
);

-- Una fila por (novedad, usuario, día): sirve para contar "más vistas de la semana"
-- sin que una sola persona infle el número recargando.
create table if not exists public.announcement_views (
  id bigint generated always as identity primary key,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  view_day date not null default current_date,
  viewed_at timestamptz not null default now(),
  unique (announcement_id, user_id, view_day)
);

alter table public.announcements enable row level security;
alter table public.announcement_views enable row level security;

drop policy if exists "novedades visibles para todos" on public.announcements;
create policy "novedades visibles para todos" on public.announcements
  for select using (true);
drop policy if exists "solo admin crea novedades" on public.announcements;
create policy "solo admin crea novedades" on public.announcements
  for insert with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "solo admin edita novedades" on public.announcements;
create policy "solo admin edita novedades" on public.announcements
  for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "solo admin elimina novedades" on public.announcements;
create policy "solo admin elimina novedades" on public.announcements
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "cada quien registra sus vistas" on public.announcement_views;
create policy "cada quien registra sus vistas" on public.announcement_views
  for insert with check (user_id = auth.uid());

-- Las 5 novedades más vistas de los últimos 7 días (empates: la más nueva primero).
create or replace function public.popular_announcements()
returns table (
  id uuid, author_id uuid, kind public.announcement_kind, title text, body text,
  photo_urls text[], event_date date, created_at timestamptz, views_7d bigint
)
language sql stable security definer set search_path = public as $$
  select a.id, a.author_id, a.kind, a.title, a.body, a.photo_urls, a.event_date,
         a.created_at, count(v.id) as views_7d
    from public.announcements a
    left join public.announcement_views v
      on v.announcement_id = a.id and v.viewed_at > now() - interval '7 days'
   group by a.id
   order by count(v.id) desc, a.created_at desc
   limit 5;
$$;

grant select on public.announcements to anon, authenticated;
grant execute on function public.popular_announcements() to anon, authenticated;

-- Storage: bucket público para fotos (créalo también desde el panel Storage,
-- nombre exacto: "fotos", marcado como público).
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

create policy "cualquiera autenticado sube fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and auth.role() = 'authenticated');
create policy "fotos son publicas para lectura" on storage.objects
  for select using (bucket_id = 'fotos');

-- Permite que alguien SIN cuenta (ej: quien recibe un link /post/<id>
-- compartido en el grupo) pueda ver una publicación activa.
grant select on posts to anon;
grant select on profiles to anon;

-- Para convertir a alguien en tienda oficial (sin precio obligatorio ni
-- límite de 3), ejecuta manualmente, reemplazando el username:
-- update profiles set is_official = true where username = 'nombre_tienda';

-- IMPRESCINDIBLE: conviértete a ti mismo (Daniel) en admin después de crear
-- tu propia cuenta por primera vez en la app, reemplazando el username:
-- update profiles set is_admin = true, status = 'APROBADO'
--   where username = 'tu_username';
