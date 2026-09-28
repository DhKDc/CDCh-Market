"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, CalendarDays, MessageCircle, X } from "lucide-react";
import { supabase, Announcement } from "../lib/supabase";
import { ANNOUNCEMENT_KIND_LABEL } from "../lib/postTypes";
import { waContactLink } from "../lib/whatsapp";
import PhotoStrip from "./PhotoStrip";

export function formatEventDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" });
}

// Carrusel de "Novedades y anuncios": últimas 5, o las 5 más vistas de los últimos 7 días.
export default function Featured() {
  const [mode, setMode] = useState<"recientes" | "vistas">("recientes");
  const [items, setItems] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Announcement | null>(null);
  const [author, setAuthor] = useState<{ username: string; phone: string | null } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (mode === "recientes") {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      setItems((data as any) || []);
    } else {
      const { data } = await supabase.rpc("popular_announcements");
      setItems((data as any) || []);
    }
    setLoaded(true);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setAuthor(null);
    if (!open) return;
    supabase
      .from("profiles")
      .select("username, phone")
      .eq("id", open.author_id)
      .maybeSingle()
      .then(({ data }) => setAuthor((data as any) || null));
  }, [open]);

  function openItem(a: Announcement) {
    setOpen(a);
    // Registra la vista (1 por usuario por día). Si ya existe, el error se ignora.
    supabase
      .from("announcement_views")
      .insert({ announcement_id: a.id })
      .then(() => {});
  }

  function scrollBy(dir: number) {
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  // Sin novedades publicadas: no se muestra la sección.
  if (loaded && mode === "recientes" && items.length === 0) return null;
  if (!loaded) return null;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between gap-2 mb-3">
        <h2 className="text-2xl leading-none">Novedades</h2>
        <div className="hidden sm:flex gap-2">
          <button className="icon-btn" onClick={() => scrollBy(-1)} aria-label="Anterior">
            <ChevronLeft size={18} />
          </button>
          <button className="icon-btn" onClick={() => scrollBy(1)} aria-label="Siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="segmented mb-3 max-w-md">
        <button
          className={`seg-item text-sm ${mode === "recientes" ? "seg-item-on" : ""}`}
          onClick={() => setMode("recientes")}
        >
          Recientes
        </button>
        <button
          className={`seg-item text-sm ${mode === "vistas" ? "seg-item-on" : ""}`}
          onClick={() => setMode("vistas")}
        >
          Más vistas (7 días)
        </button>
      </div>

      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1"
      >
        {items.map((a) => (
          <button
            key={a.id}
            onClick={() => openItem(a)}
            className="card snap-start shrink-0 w-[82%] sm:w-[340px] p-3 text-left"
          >
            <div className="photo-tile relative aspect-[16/9]">
              {a.photo_urls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photo_urls[0]} alt={a.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center bg-seg text-muted font-extrabold uppercase text-2xl">
                  {ANNOUNCEMENT_KIND_LABEL[a.kind]}
                </div>
              )}
              <span className="chip-flame absolute top-2 left-2">
                {ANNOUNCEMENT_KIND_LABEL[a.kind]}
              </span>
              {mode === "vistas" && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full">
                  <Eye size={12} /> {a.views_7d ?? 0}
                </span>
              )}
            </div>
            <h3 className="text-lg leading-tight mt-3 line-clamp-2">{a.title}</h3>
            {a.event_date && (
              <p className="text-xs text-brand-text font-semibold mt-1 inline-flex items-center gap-1">
                <CalendarDays size={13} /> {formatEventDate(a.event_date)}
              </p>
            )}
            {a.body && <p className="text-sm text-muted mt-1 line-clamp-2">{a.body}</p>}
          </button>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted py-4">Aún no hay vistas registradas esta semana.</p>
        )}
      </div>

      {open && (
        <div
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 relative"
          >
            <button
              onClick={() => setOpen(null)}
              aria-label="Cerrar"
              className="icon-btn absolute top-3 right-3 z-10 !bg-black/70 text-white"
            >
              <X size={18} />
            </button>
            <PhotoStrip urls={open.photo_urls || []} alt={open.title} />
            <div className="mt-3">
              <span className="chip-flame">{ANNOUNCEMENT_KIND_LABEL[open.kind]}</span>
              <h2 className="text-2xl leading-tight mt-2">{open.title}</h2>
              {open.event_date && (
                <p className="text-sm text-brand-text font-semibold mt-2 inline-flex items-center gap-1">
                  <CalendarDays size={15} /> {formatEventDate(open.event_date)}
                </p>
              )}
              {open.body && (
                <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{open.body}</p>
              )}
              {author?.phone && (
                <a
                  href={waContactLink(author.phone, open.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full mt-4"
                >
                  <MessageCircle size={16} /> Consultar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
