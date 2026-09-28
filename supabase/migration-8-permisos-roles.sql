-- Migración 8: permisos de tablas + un solo rol (admin / tienda oficial) + autor en novedades.
-- Ejecuta TODO el archivo en el SQL Editor (es seguro repetirlo).

-- 1) Permisos de tabla. Arregla "permission denied for table announcements":
--    RLS decide QUÉ filas, pero antes la tabla necesita el GRANT a cada rol.
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant insert on public.announcement_views to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 2) Un solo rol: is_admin = "admin / tienda oficial". Quien era is_official pasa a is_admin.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_official') then
    update public.profiles set is_admin = true where is_official;
  end if;
end $$;

create or replace function public.protect_profile_fields() returns trigger as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    new.status := old.status;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.check_post_rules() returns trigger as $$
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

  -- Admins / tiendas oficiales: sin precio obligatorio ni tope diario.
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

alter table public.profiles drop column if exists is_official;

-- 3) "Más vistas": ahora también devuelve el nombre de quien subió la novedad.
drop function if exists public.popular_announcements();
create function public.popular_announcements()
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
grant execute on function public.popular_announcements() to anon, authenticated;

-- 4) Refuerzo de permisos en TODAS las tablas, para los 3 roles que usa la app
--    (anon: visitas sin cuenta; authenticated: usuarios logueados; service_role:
--    el que usa el backend en /api/admin/*). Esto es lo que probablemente falta
--    para "permission denied for table profiles" al resetear contraseñas: las
--    tablas se crearon a mano por SQL, así que no heredaron los permisos por
--    defecto que Supabase agrega solo a tablas creadas después de configurarlos.
grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles to anon, authenticated, service_role;
grant insert, update, delete on public.profiles to authenticated, service_role;

grant select on public.posts to anon, authenticated, service_role;
grant insert, update, delete on public.posts to authenticated, service_role;

grant select on public.announcements to anon, authenticated, service_role;
grant insert, update, delete on public.announcements to authenticated, service_role;

grant select, insert on public.announcement_views to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- Verificación rápida: debe devolver una fila con tu usuario y is_admin = true.
-- select username, is_admin from public.profiles where is_admin;
