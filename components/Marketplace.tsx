"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, Post, PostType } from "../lib/supabase";
import { formatCLP } from "../lib/format";
import ThemeToggle from "../components/ThemeToggle";
import ZoomableImage from "../components/ZoomableImage";

const TYPES: PostType[] = ["VENTA", "PERMUTA", "BUSCO"];
const TYPE_LABEL: Record<PostType, string> = {
  VENTA: "Venta",
  PERMUTA: "Permuta",
  BUSCO: "Busco",
};

const MAX_PHOTOS = 6;

// Resize + compress an image client-side before upload (keeps storage light).
async function compressImage(file: File, maxW = 900, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality)
  );
}

async function uploadPhotos(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const blob = await compressImage(file);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from("fotos").upload(path, blob, {
      contentType: "image/jpeg",
    });
    if (error) throw error;
    urls.push(supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

// Arma el link de WhatsApp con el número del vendedor y un mensaje precargado.
function waLink(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hola! Vi tu publicación "${title}" en Diecast Chile Market 🚗`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

// Fila de fotos en miniatura, cada una con su propio zoom.
function PhotoStrip({ urls, alt }: { urls: string[]; alt: string }) {
  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return <ZoomableImage src={urls[0]} alt={alt} className="w-full max-h-96 object-contain bg-slate-100 dark:bg-slate-900" />;
  }
  return (
    <div className="flex gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900">
      {urls.map((u, i) => (
        <ZoomableImage
          key={i}
          src={u}
          alt={`${alt} (${i + 1}/${urls.length})`}
          className="h-72 w-auto max-w-none object-contain flex-none"
        />
      ))}
    </div>
  );
}

export default function Marketplace({
  userId,
  isOfficial,
  isAdmin,
}: {
  userId: string;
  isOfficial: boolean;
  isAdmin: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostType | "TODAS">("TODAS");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("posts")
      .select("*, profiles(username, is_official, phone)")
      .order("created_at", { ascending: false });
    if (filter !== "TODAS") q = q.eq("type", filter);
    const { data } = await q;
    setPosts((data as any) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Count this user's VENTA posts in the last 24h, to show remaining quota.
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "VENTA")
        .gte("created_at", since);
      setVentasHoy(count || 0);
    })();
  }, [posts, userId]);

  // Vendidas o vencidas: solo las ve su dueño (o el admin), por las políticas RLS.
  const isClosed = (p: Post) => p.status === "VENDIDO" || new Date(p.expires_at) < new Date();
  const closedCount = useMemo(() => posts.filter(isClosed).length, [posts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (showClosed || !isClosed(p)) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.profiles?.username || "").toLowerCase().includes(q))
    );
  }, [posts, search, showClosed]);

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">🚗 Diecast Chile Market</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAdmin && (
            <a href="/admin" className="text-sm text-amber-500 dark:text-amber-400 underline">
              Panel admin
            </a>
          )}
          <button onClick={logout} className="text-sm text-slate-500 dark:text-slate-400 underline">
            Salir
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Buscar por título, descripción o usuario..."
        className="w-full mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2"
      />

      <div className="flex gap-2 flex-wrap mb-4">
        {(["TODAS", ...TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t as any)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === t
                ? "bg-amber-500 text-slate-900 font-semibold"
                : "bg-slate-200 dark:bg-slate-800"
            }`}
          >
            {t === "TODAS" ? "Todas" : TYPE_LABEL[t as PostType]}
          </button>
        ))}
      </div>

      {closedCount > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-3">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
          />
          Mostrar vendidas y vencidas ({closedCount})
        </label>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full mb-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg py-2"
      >
        {showForm ? "Cancelar" : "+ Nueva publicación"}
      </button>

      {!(isOfficial || isAdmin) && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Ventas usadas hoy: {ventasHoy}/3
        </p>
      )}

      {showForm && (
        <PostForm
          userId={userId}
          isOfficial={isOfficial || isAdmin}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading && <p className="text-slate-500 dark:text-slate-400">Cargando...</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 mt-2">
        {visible.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            userId={userId}
            isAdmin={isAdmin}
            onChanged={load}
          />
        ))}
        {!loading && visible.length === 0 && (
          <p className="text-slate-500 text-center mt-6 col-span-full">
            No hay publicaciones que coincidan.
          </p>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post: p,
  userId,
  isAdmin,
  onChanged,
}: {
  post: Post;
  userId: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description || "");
  const [price, setPrice] = useState(p.price != null ? String(p.price) : "");
  const [tradeFor, setTradeFor] = useState(p.trade_for || "");
  const [photos, setPhotos] = useState<string[]>(p.photo_urls || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canModerate = p.user_id === userId || isAdmin;
  const thumb = p.photo_urls?.[0];
  const extraCount = (p.photo_urls?.length || 0) - 1;

  async function markSold() {
    await supabase.from("posts").update({ status: "VENDIDO" }).eq("id", p.id);
    onChanged();
  }

  const expired = new Date(p.expires_at) < new Date();

  async function renew() {
    const expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await supabase.from("posts").update({ expires_at }).eq("id", p.id);
    onChanged();
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from("posts").delete().eq("id", p.id);
    onChanged();
  }

  async function share() {
    const url = `${window.location.origin}/post/${p.id}`;
    const text = `Mira esta publicación en Diecast Chile Market: "${p.title}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text, url });
      } catch {
        /* el usuario canceló el share sheet */
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Link copiado, ya lo puedes pegar en el grupo de WhatsApp.");
    }
  }

  function removeExistingPhoto(url: string) {
    setPhotos((cur) => cur.filter((u) => u !== url));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (photos.length + newFiles.length === 0) {
      setErr("Debe quedar al menos una foto, o quita la publicación en vez de vaciarla.");
      return;
    }
    setSaving(true);
    try {
      const uploaded = newFiles.length ? await uploadPhotos(p.user_id, newFiles) : [];
      await supabase
        .from("posts")
        .update({
          title,
          description: description || null,
          price: price ? Number(price) : null,
          trade_for: p.type === "PERMUTA" ? tradeFor || null : p.trade_for,
          photo_urls: [...photos, ...uploaded],
        })
        .eq("id", p.id);
      setSaving(false);
      setEditing(false);
      onChanged();
    } catch (e: any) {
      setSaving(false);
      setErr("No se pudo guardar: " + (e?.message || "error desconocido"));
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={saveEdit}
        className="bg-white dark:bg-slate-800 rounded-xl p-3 flex flex-col gap-2 border border-amber-500"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 rounded px-2 py-1"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 rounded px-2 py-1"
        />
        {p.type === "VENTA" && (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio"
            className="bg-slate-100 dark:bg-slate-900 rounded px-2 py-1"
          />
        )}
        {p.type === "PERMUTA" && (
          <input
            value={tradeFor}
            onChange={(e) => setTradeFor(e.target.value)}
            placeholder="¿Qué busca a cambio?"
            className="bg-slate-100 dark:bg-slate-900 rounded px-2 py-1"
          />
        )}
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-16 h-16 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
          className="text-sm"
        />
        {err && <p className="text-red-500 text-xs">{err}</p>}
        <div className="flex gap-2">
          <button
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded py-1 text-sm"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded py-1 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-transparent">
      <div onClick={() => setDetailOpen(true)} className="cursor-pointer">
        {thumb && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={p.title} className="w-full h-40 object-cover" />
            {extraCount > 0 && (
              <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                +{extraCount} foto{extraCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
        <div className="p-3 pb-0">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold">
              {TYPE_LABEL[p.type]}
              {p.profiles?.is_official ? " · Tienda/Admin" : ""}
            </span>
            {p.status === "VENDIDO" && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">VENDIDO</span>
            )}
            {p.status === "ACTIVA" && expired && (
              <span className="text-xs bg-slate-500 text-white px-2 py-0.5 rounded">VENCIDA</span>
            )}
          </div>
          <h3 className="font-semibold mt-1">{p.title}</h3>
          {p.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-3">
              {p.description}
            </p>
          )}
          {p.price != null && (
            <p className="text-amber-600 dark:text-amber-300 font-bold mt-1">
              {formatCLP(p.price)}
            </p>
          )}
          {p.trade_for && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">🔁 Busca: {p.trade_for}</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            por {p.profiles?.username || "usuario"} · {expired ? "venció" : "vence"}{" "}
            {new Date(p.expires_at).toLocaleDateString("es-CL")}
          </p>
        </div>
      </div>
      <div className="p-3 pt-2">
        <div className="flex flex-wrap gap-2">
          {p.user_id !== userId && p.profiles?.phone && (
            <a
              href={waLink(p.profiles.phone, p.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-semibold"
            >
              📱 WhatsApp
            </a>
          )}
          {p.user_id === userId && p.status === "ACTIVA" && (
            <button
              onClick={markSold}
              className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
            >
              Marcar vendido
            </button>
          )}
          {canModerate && p.status === "ACTIVA" && (
            <button
              onClick={renew}
              className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
            >
              🔄 Renovar 7 días
            </button>
          )}
          <button
            onClick={share}
            className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
          >
            🔗 Compartir
          </button>
          {canModerate && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
            >
              ✏️ Editar
            </button>
          )}
          {canModerate && (
            <button
              onClick={remove}
              className="text-xs bg-red-600/10 text-red-600 dark:text-red-400 px-3 py-1 rounded"
            >
              🗑️ Eliminar
            </button>
          )}
        </div>
      </div>
    </div>

    {detailOpen && (
      <div
        onClick={() => setDetailOpen(false)}
        className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
        >
          <button
            onClick={() => setDetailOpen(false)}
            className="absolute top-2 right-2 z-10 text-white bg-black/40 hover:bg-black/60 rounded-full w-8 h-8"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <PhotoStrip urls={p.photo_urls || []} alt={p.title} />
          <div className="p-4">
            <div className="flex justify-between items-start">
              <span className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold">
                {TYPE_LABEL[p.type]}
                {p.profiles?.is_official ? " · Tienda/Admin" : ""}
              </span>
              {p.status === "VENDIDO" && (
                <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">VENDIDO</span>
              )}
              {p.status === "ACTIVA" && expired && (
                <span className="text-xs bg-slate-500 text-white px-2 py-0.5 rounded">VENCIDA</span>
              )}
            </div>
            <h3 className="font-bold text-lg mt-1">{p.title}</h3>
            {p.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                {p.description}
              </p>
            )}
            {p.price != null && (
              <p className="text-amber-600 dark:text-amber-300 font-bold text-lg mt-2">
                {formatCLP(p.price)}
              </p>
            )}
            {p.trade_for && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                🔁 Busca: {p.trade_for}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-3">
              por {p.profiles?.username || "usuario"} · {expired ? "venció" : "vence"}{" "}
              {new Date(p.expires_at).toLocaleDateString("es-CL")}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {p.user_id !== userId && p.profiles?.phone && (
                <a
                  href={waLink(p.profiles.phone, p.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-semibold"
                >
                  📱 WhatsApp
                </a>
              )}
              {p.user_id === userId && p.status === "ACTIVA" && (
                <button
                  onClick={markSold}
                  className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
                >
                  Marcar vendido
                </button>
              )}
              {canModerate && p.status === "ACTIVA" && (
                <button
                  onClick={renew}
                  className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
                >
                  🔄 Renovar 7 días
                </button>
              )}
              <button
                onClick={share}
                className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
              >
                🔗 Compartir
              </button>
              {canModerate && (
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setEditing(true);
                  }}
                  className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
                >
                  ✏️ Editar
                </button>
              )}
              {canModerate && (
                <button
                  onClick={remove}
                  className="text-xs bg-red-600/10 text-red-600 dark:text-red-400 px-3 py-1 rounded"
                >
                  🗑️ Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function PostForm({
  userId,
  isOfficial,
  onDone,
}: {
  userId: string;
  isOfficial: boolean;
  onDone: () => void;
}) {
  const [type, setType] = useState<PostType>("VENTA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tradeFor, setTradeFor] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (type === "VENTA" && !isOfficial && !price) {
      setErr("El precio es obligatorio para publicaciones de VENTA.");
      return;
    }
    if (type === "PERMUTA" && !tradeFor) {
      setErr("Indica qué buscas a cambio.");
      return;
    }
    setSaving(true);
    let photo_urls: string[] = [];
    try {
      if (files.length) photo_urls = await uploadPhotos(userId, files);
    } catch (e: any) {
      setErr("No se pudo subir alguna foto: " + (e?.message || "error desconocido"));
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      type,
      title,
      description: description || null,
      price: price ? Number(price) : null,
      trade_for: type === "PERMUTA" ? tradeFor : null,
      photo_urls,
    });
    setSaving(false);
    if (error) {
      // Surfaces the daily-limit / price-required errors raised by the DB trigger.
      setErr(error.message);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 flex flex-col gap-3 border border-slate-200 dark:border-transparent"
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PostType)}
        className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <input
        required
        placeholder="Título (ej: Hot Wheels Mainline 2026)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
      />
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
      />
      {type === "VENTA" && (
        <input
          type="number"
          placeholder={isOfficial ? "Precio (opcional para tienda/admin)" : "Precio (obligatorio)"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
        />
      )}
      {type === "PERMUTA" && (
        <input
          placeholder="¿Qué buscas a cambio?"
          value={tradeFor}
          onChange={(e) => setTradeFor(e.target.value)}
          className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
        />
      )}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, MAX_PHOTOS))}
        className="text-sm"
      />
      {files.length > 0 && (
        <p className="text-xs text-slate-500">
          {files.length} foto{files.length > 1 ? "s" : ""} seleccionada{files.length > 1 ? "s" : ""}
          {files.length >= MAX_PHOTOS ? ` (máx. ${MAX_PHOTOS})` : ""}
        </p>
      )}
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button
        disabled={saving}
        className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded py-2"
      >
        {saving ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
