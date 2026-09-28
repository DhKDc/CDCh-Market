-- Culture Diecast Chile Market — esquema de base de datos para Supabase
-- Ejecutar completo en el SQL Editor de un proyecto NUEVO. Si tu proyecto ya
-- existe, usa las migraciones en supabase/migration-*.sql en vez de esto.
--
-- IMPORTANTE (registro sin correo real): en Supabase Dashboard ve a
-- Authentication → Sign In / Providers → "User Signups" y DESACTIVA
-- "Confirm email". El registro de esta app usa un correo sintético interno
-- (nadie lo ve ni lo recibe), así que si dejas la confirmación activada
-- nadie podrá crear cuenta (Supabase esperaría un clic en un correo que
-- nunca llega) y además se agota el límite de envío de correos.

create type post_type as enum ('VENTA','PERMUTA','AMBOS','BUSCO');
create type post_status as enum ('ACTIVA','VENDIDO');
create type profile_status as enum ('PENDIENTE','APROBADO','RECHAZADO');
create type announcement_kind as enum ('NOVEDAD','PROXIMAMENTE','PREVENTA','RIFA');

-- Un solo rol de administración: is_admin cubre tanto "admin del sitio"
-- (aprueba usuarios, modera) como "tienda oficial / admin del grupo"
-- (sin límite de ventas ni precio obligatorio). Es la misma persona haciendo
-- las mismas tareas, así que no se separan en dos columnas.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  phone text,
  status profile_status not null default 'PENDIENTE',
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

-- Novedades y anuncios: futuros autos, preventas, rifas. Las suben los admins.
create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  kind announcement_kind not null default 'NOVEDAD',
  title text not null,
  body text,
  photo_urls text[] not null default '{}',
  event_date date,
  created_at timestamptz not null default now()
);

-- Una fila por (novedad, usuario, día): para "más vistas de la semana" sin
-- que una sola persona infle el número recargando la página.
create table announcement_views (
  id bigint generated always as identity primary key,
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  view_day date not null default current_date,
  viewed_at timestamptz not null default now(),
  unique (announcement_id, user_id, view_day)
);

-- Crea automáticamente un perfil cuando alguien se registra. El registro es
-- solo con username + teléfono + contraseña (sin correo real) — el "email"
-- que llega aquí es un correo sintético armado a partir del username
-- (ver lib/config.ts), así que el username real se manda en raw_user_meta_data.
create function handle_new_user() returns trigger as $$
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

-- Evita que alguien se autoapruebe o se autonombre admin: solo un admin
-- puede cambiar status o is_admin; username/phone sí los edita el dueño.
create function protect_profile_fields() returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    new.status := old.status;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_protect_profile_fields
  before update on profiles
  for each row execute function protect_profile_fields();

-- Reglas de la comunidad, aplicadas al crear una publicación:
--  * Las ventas (VENTA y AMBOS) requieren precio y respetan el máx. de 3 al
--    día, salvo cuentas is_admin (admin del sitio / tienda oficial).
--  * Las permutas (PERMUTA y AMBOS) exigen indicar qué se busca a cambio.
--  * Busco y las permutas no tienen límite diario.
create function check_post_rules() returns trigger as $$
declare
  es_admin boolean;
  estado_perfil public.profile_status;
  ventas_24h int;
  es_venta boolean;
  es_permuta boolean;
begin
  es_venta := new.type in ('VENTA', 'AMBOS');
  es_permuta := new.type in ('PERMUTA', 'AMBOS');

  select is_admin, status into es_admin, estado_perfil
    from public.profiles where id = new.user_id;

  if estado_perfil is distinct from 'APROBADO' then
    raise exception 'Tu cuenta debe ser aprobada por un administrador antes de publicar';
  end if;

  if es_venta and new.price is null and not coalesce(es_admin, false) then
    raise exception 'El precio es obligatorio para las ventas';
  end if;

  if es_venta and not coalesce(es_admin, false) then
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

-- Las 5 novedades más vistas de los últimos 7 días, con el nombre de quien
-- las subió (empates: la más nueva primero).
create function popular_announcements()
returns table (
  id uuid, author_id uuid, author_username text, kind public.announcement_kind,
  title text, body text, photo_urls text[], event_date date,
  created_at timestamptz, views_7d bigint
)
language sql stable security definer set search_path = public as $$
  select a.id, a.author_id, p.username, a.kind, a.title, a.body, a.photo_urls,
         a.event_date, a.created_at, count(v.id) as views_7d
    from public.announcements a
    join public.profiles p on p.id = a.author_id
    left join public.announcement_views v
      on v.announcement_id = a.id and v.viewed_at > now() - interval '7 days'
   group by a.id, p.username
   order by count(v.id) desc, a.created_at desc
   limit 5;
$$;

-- Row Level Security
alter table profiles enable row level security;
alter table posts enable row level security;
alter table announcements enable row level security;
alter table announcement_views enable row level security;

create policy "perfiles visibles para todos" on profiles
  for select using (true);
create policy "cada quien edita su perfil" on profiles
  for update using (auth.uid() = id);
create policy "el admin edita cualquier perfil" on profiles
  for update using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
-- Nota: el trigger trg_protect_profile_fields (arriba) es lo que realmente
-- impide que alguien cambie su propio status/is_admin; estas policies solo
-- permiten el UPDATE en general (dueño, o admin sobre cualquiera).

create policy "publicaciones activas visibles para todos, propias y admin ve todo"
  on posts for select
  using (
    (status = 'ACTIVA' and expires_at > now())
    or user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
create policy "solo el dueño crea sus publicaciones" on posts
  for insert with check (auth.uid() = user_id);
create policy "el dueño o el admin editan la publicacion" on posts
  for update using (
    auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
create policy "el dueño o el admin eliminan la publicacion" on posts
  for delete using (
    auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "novedades visibles para todos" on announcements
  for select using (true);
create policy "solo admin crea novedades" on announcements
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "solo admin edita novedades" on announcements
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "solo admin elimina novedades" on announcements
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "cada quien registra sus vistas" on announcement_views
  for insert with check (user_id = auth.uid());

-- Storage: bucket público para fotos (créalo también desde el panel Storage,
-- nombre exacto: "fotos", marcado como público).
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

create policy "cualquiera autenticado sube fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and auth.role() = 'authenticated');
create policy "fotos son publicas para lectura" on storage.objects
  for select using (bucket_id = 'fotos');

-- Permisos de tabla para los 3 roles que usa la app: anon (visitas sin
-- cuenta, ej. /post/<id> compartido), authenticated (usuarios logueados) y
-- service_role (el backend, ej. /api/admin/reset-password). RLS decide QUÉ
-- filas; esto decide si el rol puede tocar la tabla siquiera.
grant usage on schema public to anon, authenticated, service_role;

grant select on profiles to anon, authenticated, service_role;
grant insert, update, delete on profiles to authenticated, service_role;

grant select on posts to anon, authenticated, service_role;
grant insert, update, delete on posts to authenticated, service_role;

grant select on announcements to anon, authenticated, service_role;
grant insert, update, delete on announcements to authenticated, service_role;

grant select, insert on announcement_views to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on function popular_announcements() to anon, authenticated;

-- IMPRESCINDIBLE: conviértete a ti mismo en admin después de crear tu propia
-- cuenta por primera vez en la app, reemplazando el username:
-- update profiles set is_admin = true, status = 'APROBADO' where username = 'tu_username';
