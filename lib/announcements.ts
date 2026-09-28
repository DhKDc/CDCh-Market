export function formatEventDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" });
}

// El link de WhatsApp solo tiene sentido si hay algo que "comprar" o reservar.
// Una novedad simple (noticia) no lo necesita.
export function announcementNeedsContact(kind: string) {
  return kind === "PROXIMAMENTE" || kind === "PREVENTA" || kind === "RIFA";
}
