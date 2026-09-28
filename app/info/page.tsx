"use client";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK, APP_NAME } from "../../lib/config";
import ThemeToggle from "../../components/ThemeToggle";

const STEPS = [
  ["Regístrate", "Elige un nombre de usuario, una contraseña y tu teléfono (el mismo que usas en el grupo de WhatsApp)."],
  ["Espera la aprobación", "Un administrador compara tu número con el del grupo y habilita tu cuenta. Te avisan por WhatsApp."],
  ["Publica", "Toca el botón + y elige si es venta, permuta, ambas o busco. Puedes subir hasta 6 fotos (útil para lotes)."],
  ["Contacta", "El botón Contactar abre un chat de WhatsApp con el mensaje ya escrito. El trato lo cierran ustedes."],
  ["Comparte", "Cada publicación tiene un link para pegar en el grupo; se abre sin buscar nada y sin necesidad de cuenta."],
  ["Cierra o renueva", "Marca como vendido lo que ya vendiste. Si la publicación vence, puedes renovarla 7 días más."],
];

const RULES = [
  ["Claridad", "Sube fotos nítidas y especifica si es venta, permuta, ambas (venta y permuta) o busco."],
  ["Ventas", "Máximo 3 ventas por día y siempre con precio. Solo las tiendas oficiales y los admins del grupo están exentos."],
  ["Permutas", "Detalla qué buscas a cambio, con nombre del auto o una foto."],
  ["Sin límite", "Las permutas y las publicaciones de “busco” no tienen tope diario."],
  ["Vigencia", "Cada publicación dura 7 días, o hasta que la marques como vendida."],
  ["Solo en el grupo", "Cacería y Expo se publican únicamente en el chat de WhatsApp, no en la app."],
  ["Moderación", "Los administradores pueden editar o eliminar publicaciones que no cumplan estas reglas."],
];

export default function InfoPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-12">
      <div className="flex items-center justify-between mb-6">
        <a href="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Volver
        </a>
        <ThemeToggle />
      </div>

      <h1 className="page-title mb-2">Info</h1>
      <p className="text-muted mb-6">{APP_NAME} es el mercado de la comunidad {COMMUNITY_NAME}.</p>

      <a
        href={WHATSAPP_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary w-full py-3 text-base mb-8"
      >
        <MessageCircle size={18} /> Unirme al grupo de WhatsApp
      </a>

      <h2 className="text-2xl mb-3">Cómo usar la app</h2>
      <ol className="flex flex-col gap-2 mb-8">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="card p-4 flex gap-3">
            <span className="w-8 h-8 shrink-0 rounded-full bg-brand text-white font-bold grid place-items-center">
              {i + 1}
            </span>
            <div>
              <p className="font-bold">{t}</p>
              <p className="text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="text-2xl mb-3">Reglas</h2>
      <ul className="flex flex-col gap-2 mb-8">
        {RULES.map(([t, d]) => (
          <li key={t} className="card p-4">
            <p className="font-bold">{t}</p>
            <p className="text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>

      <h2 className="text-2xl mb-3">Instalar la app</h2>
      <div className="card p-4 text-sm text-muted">
        <p>
          <b className="text-fg">Android (Chrome):</b> acepta el aviso “Instalar” o usa el menú ⋮ →
          “Instalar app”.
        </p>
        <p className="mt-2">
          <b className="text-fg">iPhone (Safari):</b> toca Compartir → “Agregar a pantalla de inicio”.
        </p>
        <p className="mt-2">
          <b className="text-fg">¿Olvidaste tu contraseña?</b> Escríbele a un administrador por el
          grupo; puede generarte una temporal.
        </p>
      </div>
    </div>
  );
}
