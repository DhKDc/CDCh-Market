export const COMMUNITY_NAME = "Culture Diecast Chile";
export const WHATSAPP_GROUP_LINK =
  "https://chat.whatsapp.com/LUJEbUpDtF067H0afqrt3x?s=cl&p=a&mlu=4&ilr=4";

// El registro es solo con nombre de usuario + teléfono + contraseña (sin
// correo real). Por debajo, Supabase Auth sigue siendo email+password, así
// que armamos un correo "sintético" a partir del username. Nunca se envía
// ni se muestra al usuario, y por eso también hay que desactivar "Confirm
// email" en el dashboard de Supabase (ver README) — de lo contrario nadie
// podría confirmar un correo que no existe.
const AUTH_EMAIL_DOMAIN = "cdch-market.local";

export function usernameToSlug(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9._-]/g, "");
}

export function usernameToSyntheticEmail(username: string): string {
  return `${usernameToSlug(username)}@${AUTH_EMAIL_DOMAIN}`;
}

