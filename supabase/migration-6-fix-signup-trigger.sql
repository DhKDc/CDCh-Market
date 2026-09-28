-- ARREGLA el error 500 al registrarse ("relation "profiles" does not exist").
-- El trigger de auth.users corre con el search_path del esquema "auth", así que
-- hay que calificar la tabla como public.profiles y fijar el search_path.
-- Es seguro correrlo varias veces.

create or replace function public.handle_new_user() returns trigger as $$
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

-- Por las mismas razones, endurecemos las otras dos funciones con search_path fijo.
create or replace function public.protect_profile_fields() returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    new.status := old.status;
    new.is_admin := old.is_admin;
    new.is_official := old.is_official;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.check_post_rules() returns trigger as $$
declare
  es_oficial boolean;
  estado_perfil public.profile_status;
  ventas_24h int;
begin
  select is_official, status into es_oficial, estado_perfil
    from public.profiles where id = new.user_id;

  if estado_perfil is distinct from 'APROBADO' then
    raise exception 'Tu cuenta debe ser aprobada por un administrador antes de publicar';
  end if;

  if new.type = 'VENTA' and new.price is null and not coalesce(es_oficial, false) then
    raise exception 'El precio es obligatorio para publicaciones de VENTA';
  end if;

  if new.type = 'VENTA' and not coalesce(es_oficial, false) then
    select count(*) into ventas_24h from public.posts
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
$$ language plpgsql security definer set search_path = public;

-- Verificación: debe devolver 'profiles' (si devuelve vacío, la tabla no existe
-- en tu proyecto y hay que crear el esquema; avísame).
select to_regclass('public.profiles');
