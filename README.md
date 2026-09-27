# Diecast Chile Market

Web app para que la comunidad Diecast Chile publique ventas, permutas, cacerías,
"busco" y expos — reemplazando el descontrol de WhatsApp.

## Reglas implementadas (en la base de datos, no solo en el frontend)
- Registro con correo + contraseña + **número de teléfono** (el mismo del grupo de WhatsApp).
- Toda cuenta nueva queda **PENDIENTE** y no puede publicar hasta que un admin la apruebe
  desde el Panel de administración (`/admin`), comparando el teléfono contra la lista del grupo.
- Nadie puede auto-aprobarse: solo cuentas con `is_admin = true` pueden cambiar el estado,
  is_admin o is_official de un perfil (protegido por trigger en la base de datos).
- Máx. 3 publicaciones de **VENTA** por usuario cada 24 horas.
- Las **VENTA** requieren precio, excepto cuentas marcadas como tienda oficial/admin.
- Las **PERMUTA** exigen indicar qué se busca a cambio.
- Cada publicación queda **vigente 7 días**, o hasta que el autor la marque como "vendido".
- Solo el autor puede marcar su publicación como vendida.

## 1. Crear el proyecto en Supabase (gratis)
1. Ve a https://supabase.com → "New project".
2. Cuando esté listo, abre **SQL Editor** → pega el contenido de `supabase/schema.sql` → Run.
3. Ve a **Storage** y confirma que exista el bucket `fotos` (el script lo crea; si no aparece, créalo manualmente como público).
4. En **Project Settings → API**, copia `Project URL` y `anon public key`.

## 2. Configurar el proyecto localmente
```bash
cp .env.local.example .env.local
# pega tu URL y anon key en .env.local
npm install
npm run dev
```
Abre http://localhost:3000

## 3. Desplegar gratis (Vercel)
1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a https://vercel.com → "New Project" → importa el repo.
3. En "Environment Variables" agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Tu comunidad ya puede entrar desde el link público.

## 4. Convertirte en administrador (paso obligatorio, hazlo primero)
1. Entra a la app y crea tu propia cuenta (con tu teléfono real).
2. En el SQL Editor de Supabase, ejecuta (reemplazando tu correo):
```sql
update profiles set is_admin = true, status = 'APROBADO'
  where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```
3. Recarga la app: verás el link "Panel admin" arriba a la derecha. Ahí apruebas o
   rechazas cada solicitud nueva comparando el teléfono con tu lista del grupo de WhatsApp.

## 5. Marcar una cuenta como tienda oficial
Estas cuentas no tienen límite de 3 ventas ni precio obligatorio (deben estar además
aprobadas normalmente desde el panel admin):
```sql
update profiles set is_official = true
  where id = (select id from auth.users where email = 'correo-de-la-tienda@ejemplo.com');
```

## Actualizar un proyecto que ya está desplegado
Si ya corriste `schema.sql` antes, **no lo vuelvas a correr completo** (falla porque
los tipos ya existen). Para traer las últimas mejoras pega y ejecuta, en este orden,
`supabase/migration-2-moderacion.sql`, `supabase/migration-3-anon-select.sql` y
`supabase/migration-4-admin-perfiles.sql` en el SQL Editor, y vuelve a desplegar el
código (git push a tu repo → Vercel redeploya solo).

## Novedades de esta versión
- **Modal de detalle**: tocar la foto o el texto de una publicación abre un modal
  con la descripción completa (ya no se corta) y la foto más grande, con zoom
  disponible ahí adentro.
- **Panel admin ahora controla todo, sin tocar Supabase**:
  - Pestaña **Usuarios**: aprobar/rechazar, y marcar/quitar "tienda o admin del
    grupo" (`is_official`) y "admin del sitio" (`is_admin`) con un botón.
  - Pestaña **Publicaciones**: ver, editar y eliminar cualquier publicación, y
    marcarla vendida/reactivarla, sin depender de que el dueño lo haga.
  - **Corregí un bug**: faltaba el permiso (RLS) para que un admin editara el
    perfil de otra persona — aprobar/rechazar probablemente no estaba
    funcionando de verdad hasta ahora (`migration-4-admin-perfiles.sql`).
- **Botón "🔗 Compartir"** en cada publicación: genera un link directo
  (`/post/<id>`) que cualquiera puede abrir sin buscar nada en la app —ideal para
  pegarlo en el grupo de WhatsApp—. En celular abre el menú nativo de compartir;
  en escritorio copia el link. Esa página pública funciona incluso sin iniciar sesión.
- **Admin del sitio vs. admin del grupo**: son roles distintos. `is_admin` (el que
  aprueba cuentas en `/admin`) puede editar y eliminar cualquier publicación de
  cualquier usuario. `is_official` sigue siendo la excepción de "tienda oficial o
  admin del grupo" para el límite de 3 ventas/precio — si quieres que un admin del
  sitio también tenga esa excepción, márcalo además como `is_official` (ahora se
  hace con un botón en el panel).
- **Buscador** en la página principal, por título, descripción o nombre de usuario.
- **Grid responsivo**: las publicaciones se acomodan solas según el ancho de pantalla.
- **Modo claro/oscuro** con un botón ☀️/🌙 que recuerda tu preferencia.

## Notas
- Los imports usan rutas relativas (`../lib/...`, `../components/...`) en vez del
  alias `@/`, que no se resolvía en el build de Vercel — si agregas archivos nuevos,
  sigue ese mismo estilo.
- Las fotos se comprimen en el navegador antes de subirse (liviano y rápido).
- El login es con correo y contraseña (Supabase Auth). Se puede cambiar a
  "magic link" (sin contraseña) más adelante si prefieren.
- Si más adelante quieren notificaciones push o edición de fotos, son buenas
  siguientes mejoras sobre esta base.
