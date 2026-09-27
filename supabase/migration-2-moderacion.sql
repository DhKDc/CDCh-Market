-- Migración para el proyecto que YA está corriendo en Supabase.
-- No vuelvas a correr schema.sql completo (fallaría porque los tipos y
-- tablas ya existen). Pega y ejecuta solo esto en el SQL Editor.

-- 1) Revierte la excepción de límite de venta: solo is_official la tiene,
--    no is_admin (el admin del sitio es un rol distinto al admin/tienda
--    oficial del grupo de WhatsApp).
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

-- 2) El admin del sitio (is_admin) ahora puede ver, editar y eliminar
--    cualquier publicación, no solo las suyas.
drop policy if exists "publicaciones activas visibles para todos, y las propias siempre" on posts;
create policy "publicaciones activas visibles para todos, propias y admin ve todo"
  on posts for select
  using (
    (status = 'ACTIVA' and expires_at > now())
    or user_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "solo el dueño edita su publicacion (ej: marcar vendido)" on posts;
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
