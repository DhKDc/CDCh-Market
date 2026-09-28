// Link de WhatsApp con mensaje predefinido: "Te hablo por <título>".
export function waContactLink(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const text = `Hola! Te hablo por "${title}" que vi en Culture Diecast Chile Market`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
