import type { PostType, AnnouncementKind } from "./supabase";

export const TYPE_LABEL: Record<PostType, string> = {
  VENTA: "Venta",
  PERMUTA: "Permuta",
  AMBOS: "Venta y permuta",
  BUSCO: "Busco",
};

export const TYPE_HINT: Record<PostType, string> = {
  VENTA: "Cuenta para tu límite de 3 ventas por día. Precio obligatorio.",
  PERMUTA: "Sin límite diario. Indica qué buscas a cambio.",
  AMBOS: "Se puede comprar o cambiar. Cuenta como venta (máx. 3 por día) y pide precio y qué buscas a cambio.",
  BUSCO: "Sin límite diario. Cuéntanos qué carrito estás buscando.",
};

export const CREATE_TYPES: PostType[] = ["VENTA", "PERMUTA", "AMBOS", "BUSCO"];

export const isSale = (t: PostType) => t === "VENTA" || t === "AMBOS";
export const isTrade = (t: PostType) => t === "PERMUTA" || t === "AMBOS";

// "Venta" y "Permuta" también incluyen las publicaciones que son ambas cosas.
export function matchesFilter(t: PostType, f: PostType | "TODAS") {
  if (f === "TODAS") return true;
  if (f === "VENTA") return isSale(t);
  if (f === "PERMUTA") return isTrade(t);
  return t === f;
}

export const contactLabel = (t: PostType) =>
  t === "VENTA" || t === "AMBOS" ? "Contactar al vendedor" : "Contactar";

export const ANNOUNCEMENT_KIND_LABEL: Record<AnnouncementKind, string> = {
  NOVEDAD: "Novedad",
  PROXIMAMENTE: "Próximamente",
  PREVENTA: "Preventa",
  RIFA: "Rifa",
};
