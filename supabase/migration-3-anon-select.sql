-- Permite que alguien SIN cuenta (por ejemplo, quien recibe el link
-- compartido en el grupo de WhatsApp) pueda ver una publicación activa.
-- Las políticas RLS ya lo permiten; esto solo asegura que el rol "anon"
-- tenga el GRANT de lectura sobre las tablas (normalmente ya viene por
-- defecto en Supabase, pero no está de más asegurarlo).
grant select on posts to anon;
grant select on profiles to anon;
