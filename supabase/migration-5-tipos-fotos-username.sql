-- Migración para el proyecto YA desplegado. Ejecuta todo esto de una vez
-- en el SQL Editor de Supabase.

-- 1) Elimina publicaciones de las categorías que ya no viven en la app
--    (CACERIA y EXPO ahora se manejan solo por el chat de WhatsApp).
--    El tipo enum conserva esos valores internamente (Postgres no permite
--    borrarlos fácil), pero la app ya no los deja crear ni los muestra.
delete from posts where type in ('CACERIA', 'EXPO');

-- 2) Multi-foto: agrega photo_urls (arreglo), migra photo_url y elimina la
--    columna vieja.
alter table posts add column if not exists photo_urls text[] not null default '{}';
update posts set photo_urls = array[photo_url]
  where photo_url is not null and photo_urls = '{}';
alter table posts drop column if exists photo_url;

-- 3) Registro solo con username + teléfono + contraseña (sin correo real).
--    Requiere unicidad de username. OJO: esto falla si ya existen usernames
--    duplicados — si falla, resuelve el duplicado a mano y reintenta.
alter table profiles add constraint profiles_username_key unique (username);

create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, username, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
      new.raw_user_meta_data ->> 'phone'
    );
  return new;
end;
$$ language plpgsql security definer;

-- 4) IMPRESCINDIBLE: en Supabase Dashboard → Authentication → Providers →
--    Email, DESACTIVA "Confirm email". El correo que se usa ahora es
--    sintético (nadie lo recibe), así que si dejas la confirmación
--    encendida nadie podrá completar el registro.
