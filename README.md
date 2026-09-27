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

## Notas
- Las fotos se comprimen en el navegador antes de subirse (liviano y rápido).
- El login es con correo y contraseña (Supabase Auth). Se puede cambiar a
  "magic link" (sin contraseña) más adelante si prefieren.
- Si más adelante quieren notificaciones o buscador, son buenas siguientes
  mejoras sobre esta base.
