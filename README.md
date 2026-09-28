# Diecast Chile Market

Web app para la comunidad Culture Diecast Chile: ventas, permutas y "busco" de
carritos, reemplazando el descontrol de WhatsApp. (Cacería y Expo quedan solo en
el chat del grupo, no en la app.)

## Reglas (aplicadas en la base de datos, no solo en pantalla)
- Registro con **nombre de usuario + teléfono + contraseña** (sin correo real ni
  verificación por mail). El teléfono se normaliza a formato chileno `+569XXXXXXXX`.
- Toda cuenta nueva queda **PENDIENTE** hasta que un admin del sitio la apruebe
  desde `/admin`, comparando el teléfono contra la lista del grupo de WhatsApp.
- Máx. 3 publicaciones de **VENTA** por usuario cada 24 horas, y precio obligatorio,
  salvo cuentas `is_official` (tiendas oficiales / admins del grupo).
- **PERMUTA** exige indicar qué se busca a cambio.
- Publicaciones vigentes **7 días** o hasta marcarse vendidas.
- Hasta **6 fotos** por publicación (útil para lotes); se pueden agregar/quitar al editar.
- Admin del sitio (`is_admin`) es un rol distinto de tienda/admin del grupo
  (`is_official`): el primero modera todo, el segundo solo se exime del límite de ventas.

## 1. Crear el proyecto en Supabase (gratis)
1. https://supabase.com → "New project".
2. **SQL Editor** → pega `supabase/schema.sql` → Run.
3. **Authentication → Providers → Email → desactiva "Confirm email"**
   (obligatorio: el registro usa un correo interno sintético que nadie recibe).
4. **Storage**: confirma que exista el bucket público `fotos`.
5. **Project Settings → API**: copia `Project URL` y `anon public key`.

## 2. Correr local
```bash
cp .env.local.example .env.local   # pega URL y anon key
npm install
npm run dev
```

## 3. Desplegar en Vercel
Sube el repo a GitHub → Vercel → New Project → agrega las variables
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Deploy.

### Variable secreta para resetear contraseñas
Agrega también en Vercel (Settings → Environment Variables) `SUPABASE_SERVICE_ROLE_KEY`
con la clave `service_role` de Supabase (Project Settings → API). Es **secreta**: nunca
con prefijo `NEXT_PUBLIC_` ni en GitHub. Solo la usa `/api/admin/reset-password`, que
verifica en el servidor que quien llama sea admin del sitio. Sin ella, todo funciona
excepto el botón "Resetear contraseña".

## 4. Convertirte en admin (hazlo primero)
Crea tu cuenta en la app y luego, en el SQL Editor:
```sql
update profiles set is_admin = true, status = 'APROBADO'
  where username = 'tu_username';
```
Desde ahí todo (aprobar usuarios, permisos, editar/eliminar publicaciones) se hace
en `/admin`, sin volver a Supabase.

## Funciones para administrar la comunidad
- **Avisar aprobación**: al aprobar a alguien aparece un botón que abre WhatsApp con un
  mensaje listo para esa persona (también disponible en la pestaña Usuarios).
- **Resetear contraseña**: genera una contraseña temporal (se muestra una sola vez) y la
  puedes enviar por WhatsApp. Como no hay correo, es la forma de recuperar una cuenta.
- **Renovar 7 días**: el dueño (o un admin) puede extender una publicación activa o vencida.
- **Vendidas y vencidas**: se ocultan por defecto del feed de su dueño/admin, con un check
  para mostrarlas. Para el resto de los usuarios ya estaban ocultas.

## Actualizar un proyecto que ya está desplegado
**No vuelvas a correr `schema.sql`** (falla: los tipos ya existen). Ejecuta en el
SQL Editor, en orden, las migraciones que aún no hayas corrido:
1. `migration-2-moderacion.sql`
2. `migration-3-anon-select.sql`
3. `migration-4-admin-perfiles.sql` (arregla un bug: sin ella aprobar usuarios no funcionaba)
4. `migration-5-tipos-fotos-username.sql` (quita cacería/expo y borra sus publicaciones
   existentes, pasa a multi-foto, username único)

Y luego, en Supabase: **Authentication → Providers → Email → desactiva "Confirm email"**.
Después haz push al repo y Vercel redeploya.

**Ojo con las cuentas existentes**: las creadas con correo real siguen funcionando
con su correo, pero el login ahora pide *nombre de usuario*, que arma un correo
interno distinto. Las cuentas viejas no podrán entrar con el nuevo formulario;
lo más simple es que se registren de nuevo (o borrarlas en Authentication → Users
y pedirles que se registren otra vez).

## Notas
- Los imports usan rutas relativas (`../lib/...`), no el alias `@/`, que no se
  resolvía en el build de Vercel.
- Las fotos se comprimen en el navegador antes de subirse.
- Formatos comunes en `lib/format.ts` (pesos chilenos, teléfono `+56 9 XXXX XXXX`).
