// Formatos comunes de la app, para no repetir lógica en cada componente.

export function formatCLP(value: number): string {
  return "$" + Math.round(value).toLocaleString("es-CL");
}

// Normaliza cualquier variante de número chileno a formato E.164 (+56912345678).
// Acepta: 912345678, 56912345678, +56 9 1234 5678, 9 1234-5678, etc.
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("56")) {
    // ya trae código de país
  } else if (digits.startsWith("9") && digits.length === 9) {
    digits = "56" + digits;
  } else if (digits.length === 8) {
    digits = "569" + digits;
  }
  return "+" + digits;
}

export function isValidChileanMobile(raw: string): boolean {
  return /^\+569\d{8}$/.test(normalizePhone(raw));
}

// +56912345678 -> +56 9 1234 5678 (para mostrar en pantalla)
export function displayPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("569")) {
    return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  return value;
}
