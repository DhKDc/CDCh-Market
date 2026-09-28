"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2, Pencil, CalendarDays } from "lucide-react";
import { supabase, Announcement } from "../lib/supabase";
import { ANNOUNCEMENT_KIND_LABEL } from "../lib/postTypes";
import { formatEventDate } from "../lib/announcements";
import AnnouncementForm from "./AnnouncementForm";

export default function AdminAnnouncements({ userId }: { userId: string }) {
  const [list, setList] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    setList(((data as any) || []).map((a: any) => ({ ...a, author_username: a.profiles?.username })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <h3 className="text-lg mb-3">Nueva novedad o anuncio</h3>
        <AnnouncementForm userId={userId} onDone={load} />
      </div>

      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <AnnouncementRow key={a.id} a={a} onChanged={load} />
        ))}
        {list.length === 0 && <p className="text-muted text-center">Aún no hay novedades publicadas.</p>}
      </div>
    </div>
  );
}

function AnnouncementRow({ a, onChanged }: { a: Announcement; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(a.title);
  const [body, setBody] = useState(a.body || "");
  const [eventDate, setEventDate] = useState(a.event_date || "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("announcements").update({ title, body: body || null, event_date: eventDate || null }).eq("id", a.id);
    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${a.title}"?`)) return;
    await supabase.from("announcements").delete().eq("id", a.id);
    onChanged();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="card p-3 flex flex-col gap-2 border-brand">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1">Guardar</button>
          <button type="button" onClick={() => setEditing(false)} className="btn flex-1">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card p-3 flex items-center gap-3">
      {a.photo_urls?.[0] && (
        <div className="photo-tile w-16 h-16 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.photo_urls[0]} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="chip-flame">{ANNOUNCEMENT_KIND_LABEL[a.kind]}</span>
        <p className="font-bold leading-tight mt-1 truncate">{a.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {a.event_date && (
            <p className="text-xs text-brand-text font-semibold inline-flex items-center gap-1">
              <CalendarDays size={12} /> {formatEventDate(a.event_date)}
            </p>
          )}
          {a.author_username && <p className="text-xs text-muted">por @{a.author_username}</p>}
        </div>
      </div>
      <button onClick={() => setEditing(true)} aria-label="Editar" className="icon-btn">
        <Pencil size={16} />
      </button>
      <button onClick={remove} aria-label="Eliminar" className="icon-btn !text-flame">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
