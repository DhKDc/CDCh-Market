"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2, Pencil, CalendarDays } from "lucide-react";
import { supabase, Announcement, AnnouncementKind } from "../lib/supabase";
import { ANNOUNCEMENT_KIND_LABEL } from "../lib/postTypes";
import { uploadPhotos, MAX_PHOTOS } from "../lib/photos";
import { formatEventDate } from "./Featured";
import PhotoPicker from "./PhotoPicker";

const KINDS = Object.keys(ANNOUNCEMENT_KIND_LABEL) as AnnouncementKind[];

export default function AdminAnnouncements({ userId }: { userId: string }) {
  const [list, setList] = useState<Announcement[]>([]);
  const [kind, setKind] = useState<AnnouncementKind>("NOVEDAD");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setList((data as any) || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const photo_urls = files.length ? await uploadPhotos(userId, files) : [];
      const { error } = await supabase.from("announcements").insert({
        kind,
        title,
        body: body || null,
        event_date: eventDate || null,
        photo_urls,
      });
      if (error) throw error;
      setTitle("");
      setBody("");
      setEventDate("");
      setFiles([]);
      setKind("NOVEDAD");
      load();
    } catch (e: any) {
      setErr("No se pudo publicar: " + (e?.message || "error desconocido"));
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="card p-4 flex flex-col gap-3">
        <h3 className="text-lg">Nueva novedad o anuncio</h3>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`btn ${kind === k ? "btn-primary" : "btn-outline"}`}
            >
              {ANNOUNCEMENT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <input
          required
          className="input"
          placeholder="Título (ej: Preventa Team Transport 2026)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input"
          rows={4}
          placeholder="Detalles: precio, cupos, cómo participar, fecha de llegada..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label className="text-sm text-muted">
          Fecha (llegada, cierre o sorteo) — opcional
          <input
            type="date"
            className="input mt-1"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </label>
        <PhotoPicker files={files} onFilesChange={setFiles} max={MAX_PHOTOS} />
        {err && <p className="text-flame text-sm">{err}</p>}
        <button disabled={saving} className="btn btn-primary w-full py-3">
          {saving ? "Publicando..." : "Publicar en Novedades"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <AnnouncementRow key={a.id} a={a} onChanged={load} />
        ))}
        {list.length === 0 && (
          <p className="text-muted text-center">Aún no hay novedades publicadas.</p>
        )}
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
    await supabase
      .from("announcements")
      .update({ title, body: body || null, event_date: eventDate || null })
      .eq("id", a.id);
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
        <input
          type="date"
          className="input"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
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
        {a.event_date && (
          <p className="text-xs text-brand-text font-semibold inline-flex items-center gap-1">
            <CalendarDays size={12} /> {formatEventDate(a.event_date)}
          </p>
        )}
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
