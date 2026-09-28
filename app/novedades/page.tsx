"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Eye, MessageCircle, Plus, X } from "lucide-react";
import { supabase, Announcement, Profile } from "../../lib/supabase";
import { ANNOUNCEMENT_KIND_LABEL } from "../../lib/postTypes";
import { announcementNeedsContact, formatEventDate } from "../../lib/announcements";
import { waContactLink } from "../../lib/whatsapp";
import ThemeToggle from "../../components/ThemeToggle";
import Gallery from "../../components/Gallery";
import AnnouncementForm from "../../components/AnnouncementForm";
import BottomNav from "../../components/BottomNav";

export default function NovedadesPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [mode, setMode] = useState<"recientes" | "vistas">("recientes");
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState<Announcement | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      setMe((prof as Profile) || null);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    if (mode === "recientes") {
      const { data } = await supabase
        .from("announcements")
        .select("*, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(30);
      setItems(((data as any) || []).map((a: any) => ({ ...a, author_username: a.profiles?.username })));
    } else {
      const { data } = await supabase.rpc("popular_announcements");
      setItems((data as any) || []);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPhone(null);
    if (!open) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", open.author_id)
      .maybeSingle()
      .then(({ data }) => setPhone((data as any)?.phone || null));
  }, [open]);

  function openItem(a: Announcement) {
    setOpen(a);
    supabase.from("announcement_views").insert({ announcement_id: a.id }).then(() => {});
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-28">
      <header className="flex items-center justify-between gap-2 mb-6">
        <span className="text-flame font-extrabold italic uppercase leading-none tracking-tight">
          Culture Diecast Chile
        </span>
        <ThemeToggle />
      </header>

      <h1 className="page-title mb-5">Novedades</h1>

      <div className="segmented mb-4 max-w-md">
        <button onClick={() => setMode("recientes")} className={`seg-item text-sm ${mode === "recientes" ? "seg-item-on" : ""}`}>
          Recientes
        </button>
        <button onClick={() => setMode("vistas")} className={`seg-item text-sm ${mode === "vistas" ? "seg-item-on" : ""}`}>
          Más vistas (7 días)
        </button>
      </div>

      {loading && <p className="text-muted">Cargando...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((a) => (
          <button key={a.id} onClick={() => openItem(a)} className="card p-3 text-left">
            <div className="photo-tile relative aspect-[16/9]">
              {a.photo_urls?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.photo_urls[0]} alt={a.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center bg-seg text-muted font-extrabold uppercase text-xl text-center px-2">
                  {ANNOUNCEMENT_KIND_LABEL[a.kind]}
                </div>
              )}
              <span className="chip-flame absolute top-2 left-2">{ANNOUNCEMENT_KIND_LABEL[a.kind]}</span>
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
            {a.author_username && <p className="text-xs text-muted mt-2">por @{a.author_username}</p>}
          </button>
        ))}
      </div>
      {!loading && items.length === 0 && (
        <p className="text-muted text-center mt-10">
          {mode === "vistas" ? "Aún no hay vistas registradas esta semana." : "Todavía no hay novedades publicadas."}
        </p>
      )}

      {me?.is_admin && (
        <button
          onClick={() => setShowForm(true)}
          aria-label="Nueva novedad"
          className="fixed bottom-24 right-5 z-30 w-16 h-16 rounded-full bg-brand text-white grid place-items-center shadow-lg shadow-black/40 active:scale-95 transition"
        >
          <Plus size={30} />
        </button>
      )}

      {showForm && me && (
        <div onClick={() => setShowForm(false)} className="fixed inset-0 z-40 bg-black/70 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-lg mx-auto my-6 p-4 relative">
            <button onClick={() => setShowForm(false)} aria-label="Cerrar" className="icon-btn absolute top-3 right-3">
              <X size={18} />
            </button>
            <h2 className="text-2xl mb-4">Nueva novedad</h2>
            <AnnouncementForm
              userId={me.id}
              onDone={() => {
                setShowForm(false);
                load();
              }}
            />
          </div>
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(null)} className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 relative">
            <button onClick={() => setOpen(null)} aria-label="Cerrar" className="icon-btn absolute top-3 right-3 z-10 !bg-black/70 text-white">
              <X size={18} />
            </button>
            <Gallery urls={open.photo_urls || []} alt={open.title} ratio="aspect-[4/3]" />
            <div className="mt-3">
              <span className="chip-flame">{ANNOUNCEMENT_KIND_LABEL[open.kind]}</span>
              <h2 className="text-2xl leading-tight mt-2">{open.title}</h2>
              {open.event_date && (
                <p className="text-sm text-brand-text font-semibold mt-2 inline-flex items-center gap-1">
                  <CalendarDays size={15} /> {formatEventDate(open.event_date)}
                </p>
              )}
              {open.body && <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{open.body}</p>}
              {open.author_username && <p className="text-xs text-muted mt-3">Subido por @{open.author_username}</p>}
              {announcementNeedsContact(open.kind) && phone && (
                <a href={waContactLink(phone, open.title)} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full mt-4">
                  <MessageCircle size={16} /> Consultar por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
