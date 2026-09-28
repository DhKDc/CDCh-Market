"use client";
import { useState } from "react";
import { supabase, AnnouncementKind } from "../lib/supabase";
import { ANNOUNCEMENT_KIND_LABEL } from "../lib/postTypes";
import { uploadPhotos, MAX_PHOTOS } from "../lib/photos";
import PhotoPicker from "./PhotoPicker";

const KINDS = Object.keys(ANNOUNCEMENT_KIND_LABEL) as AnnouncementKind[];

// Formulario para crear una novedad/anuncio. Lo usan tanto el panel admin
// como el botón "+ Nueva novedad" directo en la página de Novedades.
export default function AnnouncementForm({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<AnnouncementKind>("NOVEDAD");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
      onDone();
    } catch (e: any) {
      setErr("No se pudo publicar: " + (e?.message || "error desconocido"));
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`btn ${kind === k ? "btn-primary" : "btn-outline"}`}>
            {ANNOUNCEMENT_KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <input required className="input" placeholder="Título (ej: Preventa Team Transport 2026)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input" rows={4} placeholder="Detalles: precio, cupos, cómo participar, fecha de llegada..." value={body} onChange={(e) => setBody(e.target.value)} />
      <label className="text-sm text-muted">
        Fecha (llegada, cierre o sorteo) — opcional
        <input type="date" className="input mt-1" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </label>
      <PhotoPicker files={files} onFilesChange={setFiles} max={MAX_PHOTOS} />
      {err && <p className="text-flame text-sm">{err}</p>}
      <button disabled={saving} className="btn btn-primary w-full py-3">
        {saving ? "Publicando..." : "Publicar en Novedades"}
      </button>
    </form>
  );
}
