-- Diecast Chile Market — esquema de base de datos para Supabase
-- Ejecutar completo en el SQL Editor de tu proyecto Supabase.

create type post_type as enum ('VENTA','PERMUTA','CACERIA','BUSCO','EXPO');
create type post_status as enum ('ACTIVA','VENDIDO');
create type profile_status as enum ('PENDIENTE','APROBADO','RECHAZADO');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
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
  photo_url text,
  status post_status not null default 'ACTIVA',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Crea automáticamente un perfil cuando alguien se registra, guardando el
-- teléfono que ingresó en el formulario (queda en PENDIENTE hasta que un
-- admin lo revise contra la lista de números del grupo de WhatsApp).
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, username, phone)
    values (new.id, split_part(new.email, '@', 1), new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Evita que alguien se autoapruebe: solo un admin puede cambiar status,
-- is_admin o is_official; cualquier otro cambio (username, phone) sí lo
-- puede hacer el propio dueño del perfil.
create or replace function protect_profile_fields() returns trigger as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    new.status := old.status;
    new.is_admin := old.is_admin;
    new.is_official := old.is_official;
  end if;
  return new;
end;
$$ language plpgsql security definer;

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
create or replace function check_post_rules() returns trigger as $$
declare
  es_oficial boolean;
  estado_perfil profile_status;
  ventas_24h int;
begin
  select is_official, status into es_oficial, estado_perfil
    from profiles where id = new.user_id;

  if estado_perfil is distinct from 'APROBADO' then
    raise exception 'Tu cuenta debe ser aprobada por un administrador antes de publicar';
  end if;

  if new.type = 'VENTA' and new.price is null and not coalesce(es_oficial, false) then
    raise exception 'El precio es obligatorio para publicaciones de VENTA';
  end if;

  if new.type = 'VENTA' and not coalesce(es_oficial, false) then
    select count(*) into ventas_24h from posts
      where user_id = new.user_id
        and type = 'VENTA'
        and created_at > now() - interval '24 hours';
    if ventas_24h >= 3 then
      raise exception 'Máximo 3 publicaciones de VENTA por día';
    end if;
  end if;

  if new.type = 'PERMUTA' and (new.trade_for is null or new.trade_for = '') then
    raise exception 'Debes indicar qué buscas a cambio en una PERMUTA';
  end if;

  return new;
end;
$$ language plpgsql security definer;

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

-- Storage: bucket público para fotos (créalo también desde el panel Storage,
-- nombre exacto: "fotos", marcado como público).
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

create policy "cualquiera autenticado sube fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and auth.role() = 'authenticated');
create policy "fotos son publicas para lectura" on storage.objects
  for select using (bucket_id = 'fotos');

-- Para convertir a alguien en tienda oficial (sin precio obligatorio ni
-- límite de 3), ejecuta manualmente, reemplazando el correo:
-- update profiles set is_official = true
--   where id = (select id from auth.users where email = 'tienda@ejemplo.com');

-- IMPRESCINDIBLE: conviértete a ti mismo (Daniel) en admin después de crear
-- tu propia cuenta por primera vez en la app, o nadie podrá aprobar a nadie:
-- update profiles set is_admin = true, status = 'APROBADO'
--   where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
