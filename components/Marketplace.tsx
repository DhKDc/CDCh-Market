"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search, MessageCircle, Share2, Plus, Info, LogOut, ShieldCheck, X,
  ChevronRight, CheckCheck, RefreshCw, Pencil, Trash2,
} from "lucide-react";
import { supabase, Post, PostType } from "../lib/supabase";
import { formatCLP } from "../lib/format";
import {
  TYPE_LABEL, TYPE_HINT, CREATE_TYPES, isSale, isTrade, matchesFilter, contactLabel,
} from "../lib/postTypes";
import { waContactLink } from "../lib/whatsapp";
import { uploadPhotos, MAX_PHOTOS } from "../lib/photos";
import ThemeToggle from "./ThemeToggle";
import PhotoPicker from "./PhotoPicker";
import Gallery from "./Gallery";
import BottomNav from "./BottomNav";

const FILTERS: { key: PostType | "TODAS"; label: string }[] = [
  { key: "TODAS", label: "Todas" },
  { key: "VENTA", label: "Venta" },
  { key: "PERMUTA", label: "Permuta" },
  { key: "BUSCO", label: "Busco" },
];

const isClosed = (p: Post) => p.status === "VENDIDO" || new Date(p.expires_at) < new Date();

export default function Marketplace({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostType | "TODAS">("TODAS");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ventasHoy, setVentasHoy] = useState(0);
  const [showClosed, setShowClosed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, is_admin, phone)")
      .order("created_at", { ascending: false });
    setPosts((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Ventas (VENTA + AMBOS) de este usuario en las últimas 24 h.
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("type", ["VENTA", "AMBOS"])
        .gte("created_at", since);
      setVentasHoy(count || 0);
    })();
  }, [posts, userId]);

  const closedCount = useMemo(() => posts.filter(isClosed).length, [posts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter(
      (p) =>
        matchesFilter(p.type, filter) &&
        (showClosed || !isClosed(p)) &&
        (!q ||
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.profiles?.username || "").toLowerCase().includes(q))
    );
  }, [posts, search, filter, showClosed]);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-28">
      <header className="flex items-center justify-between gap-2 mb-6">
        <span className="text-flame font-extrabold italic uppercase leading-none tracking-tight">
          Culture Diecast Chile
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="/info" className="icon-btn" aria-label="Info y reglas">
            <Info size={18} />
          </a>
          {isAdmin && (
            <a href="/admin" className="icon-btn" aria-label="Panel de administración">
              <ShieldCheck size={18} />
            </a>
          )}
          <button onClick={() => supabase.auth.signOut()} className="icon-btn" aria-label="Salir">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <h1 className="page-title mb-5">Mercado</h1>

      <div className="segmented mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`seg-item text-sm sm:text-base ${filter === f.key ? "seg-item-on" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, descripción o usuario"
          className="input pl-12"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-muted mr-1">
          {visible.length} publicaci{visible.length === 1 ? "ón" : "ones"}
        </span>
        {!isAdmin && <span className="pill text-xs font-semibold">Ventas hoy {ventasHoy}/3</span>}
        {closedCount > 0 && (
          <button
            onClick={() => setShowClosed(!showClosed)}
            className={`pill text-xs font-semibold ${showClosed ? "!bg-brand !border-brand text-white" : ""}`}
          >
            Vendidas y vencidas ({closedCount})
          </button>
        )}
      </div>

      {loading && <p className="text-muted">Cargando...</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((p) => (
          <PostCard key={p.id} post={p} userId={userId} isAdmin={isAdmin} onChanged={load} />
        ))}
      </div>
      {!loading && visible.length === 0 && (
        <p className="text-muted text-center mt-10">No hay publicaciones que coincidan.</p>
      )}

      <button
        onClick={() => setShowForm(true)}
        aria-label="Nueva publicación"
        className="fixed bottom-24 right-5 z-30 w-16 h-16 rounded-full bg-brand text-white grid place-items-center shadow-lg shadow-black/40 active:scale-95 transition"
      >
        <Plus size={30} />
      </button>

      {showForm && (
        <div onClick={() => setShowForm(false)} className="fixed inset-0 z-40 bg-black/70 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-lg mx-auto my-6 p-4 relative">
            <button onClick={() => setShowForm(false)} aria-label="Cerrar" className="icon-btn absolute top-3 right-3">
              <X size={18} />
            </button>
            <h2 className="text-2xl mb-4">Nueva publicación</h2>
            <PostForm
              userId={userId}
              isAdmin={isAdmin}
              onDone={() => {
                setShowForm(false);
                load();
              }}
            />
          </div>
        </div>
      )}

      <BottomNav />
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
  const [existing, setExisting] = useState<string[]>(p.photo_urls || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isOwner = p.user_id === userId;
  const canModerate = isOwner || isAdmin;
  const expired = new Date(p.expires_at) < new Date();
  const thumb = p.photo_urls?.[0];
  const extra = (p.photo_urls?.length || 0) - 1;
  const phone = p.profiles?.phone;

  async function markSold() {
    await supabase.from("posts").update({ status: "VENDIDO" }).eq("id", p.id);
    setDetailOpen(false);
    onChanged();
  }

  async function renew() {
    const expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await supabase.from("posts").update({ expires_at }).eq("id", p.id);
    onChanged();
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from("posts").delete().eq("id", p.id);
    setDetailOpen(false);
    onChanged();
  }

  async function share() {
    const url = `${window.location.origin}/post/${p.id}`;
    const text = `Mira esta publicación en Culture Diecast Chile Market: "${p.title}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, text, url });
      } catch {
        /* el usuario canceló */
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Link copiado, ya lo puedes pegar en el grupo de WhatsApp.");
    }
  }

  function cancelEdit() {
    setEditing(false);
    setErr(null);
    setExisting(p.photo_urls || []);
    setNewFiles([]);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (isSale(p.type) && !price && !isAdmin) {
      setErr("El precio es obligatorio en las ventas.");
      return;
    }
    if (isTrade(p.type) && !tradeFor) {
      setErr("Indica qué buscas a cambio.");
      return;
    }
    if (existing.length + newFiles.length === 0) {
      setErr("Deja al menos una foto (o elimina la publicación).");
      return;
    }
    setSaving(true);
    try {
      const uploaded = newFiles.length ? await uploadPhotos(p.user_id, newFiles) : [];
      const { error } = await supabase
        .from("posts")
        .update({
          title,
          description: description || null,
          price: isSale(p.type) && price ? Number(price) : null,
          trade_for: isTrade(p.type) ? tradeFor || null : null,
          photo_urls: [...existing, ...uploaded],
        })
        .eq("id", p.id);
      if (error) throw error;
      setNewFiles([]);
      setEditing(false);
      onChanged();
    } catch (e: any) {
      setErr("No se pudo guardar: " + (e?.message || "error desconocido"));
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="card p-3 flex flex-col gap-3 col-span-2 md:col-span-1 border-brand">
        <h3 className="text-base">Editar publicación</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          rows={3}
          placeholder="Descripción"
        />
        {isSale(p.type) && (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio en pesos"
            className="input"
          />
        )}
        {isTrade(p.type) && (
          <input
            value={tradeFor}
            onChange={(e) => setTradeFor(e.target.value)}
            placeholder="¿Qué buscas a cambio?"
            className="input"
          />
        )}
        <PhotoPicker existing={existing} onExistingChange={setExisting} files={newFiles} onFilesChange={setNewFiles} max={MAX_PHOTOS} />
        {err && <p className="text-flame text-sm">{err}</p>}
        <div className="flex gap-2">
          <button disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={cancelEdit} className="btn flex-1">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <article className="card p-3 flex flex-col">
        <div onClick={() => setDetailOpen(true)} className="cursor-pointer">
          <div className="photo-tile relative aspect-[4/3]">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={p.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full grid place-items-center text-sm text-neutral-500">Sin foto</div>
            )}
            {extra > 0 && (
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                +{extra} foto{extra > 1 ? "s" : ""}
              </span>
            )}
            {p.status === "VENDIDO" && <span className="chip-flame absolute top-2 left-2">Vendido</span>}
            {p.status === "ACTIVA" && expired && <span className="chip-flame absolute top-2 left-2">Vencida</span>}
          </div>
          <h3 className="text-[15px] leading-tight mt-3 line-clamp-2 min-h-[2.4em]">{p.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="chip-blue">{TYPE_LABEL[p.type]}</span>
            {p.price != null && <span className="tagchip">{formatCLP(p.price)}</span>}
            {p.profiles?.is_admin && <span className="tagchip">Tienda</span>}
          </div>
          {p.trade_for && <p className="text-xs text-muted mt-2 line-clamp-2">Busca: {p.trade_for}</p>}
          <p className="text-xs text-muted mt-2">
            @{p.profiles?.username || "usuario"} · {expired ? "venció" : "vence"}{" "}
            {new Date(p.expires_at).toLocaleDateString("es-CL")}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {!isOwner && phone && (
            <a href={waContactLink(phone, p.title)} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
              <MessageCircle size={16} /> Contactar
            </a>
          )}
          {isOwner && p.status === "ACTIVA" && (
            <button onClick={markSold} className="btn btn-primary w-full">
              <CheckCheck size={16} /> Marcar vendido
            </button>
          )}
          <div className="flex rounded-full border border-line overflow-hidden">
            <button onClick={share} aria-label="Compartir" className="flex-1 py-2.5 grid place-items-center">
              <Share2 size={17} />
            </button>
            <button onClick={() => setDetailOpen(true)} aria-label="Ver detalle" className="flex-1 py-2.5 grid place-items-center border-l border-line">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </article>

      {detailOpen && (
        <div onClick={() => setDetailOpen(false)} className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 relative">
            <button onClick={() => setDetailOpen(false)} aria-label="Cerrar" className="icon-btn absolute top-3 right-3 z-10 !bg-black/70 text-white">
              <X size={18} />
            </button>
            <Gallery urls={p.photo_urls || []} alt={p.title} ratio="aspect-square" />
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip-blue">{TYPE_LABEL[p.type]}</span>
                {p.profiles?.is_admin && <span className="tagchip">Tienda</span>}
                {p.status === "VENDIDO" && <span className="chip-flame">Vendido</span>}
                {p.status === "ACTIVA" && expired && <span className="chip-flame">Vencida</span>}
              </div>
              <h2 className="text-2xl leading-tight mt-2">{p.title}</h2>
              {p.price != null && <p className="text-2xl font-extrabold text-brand-text mt-2">{formatCLP(p.price)}</p>}
              {p.description && <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{p.description}</p>}
              {p.trade_for && (
                <p className="text-sm mt-3">
                  <span className="text-muted">Busca a cambio: </span>
                  {p.trade_for}
                </p>
              )}
              <p className="text-xs text-muted mt-3">
                @{p.profiles?.username || "usuario"} · {expired ? "venció" : "vence"}{" "}
                {new Date(p.expires_at).toLocaleDateString("es-CL")}
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {!isOwner && phone && (
                  <a href={waContactLink(phone, p.title)} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
                    <MessageCircle size={16} /> {contactLabel(p.type)}
                  </a>
                )}
                {isOwner && p.status === "ACTIVA" && (
                  <button onClick={markSold} className="btn btn-primary w-full">
                    <CheckCheck size={16} /> Marcar vendido
                  </button>
                )}
                <button onClick={share} className="btn btn-outline">
                  <Share2 size={16} /> Compartir
                </button>
                {canModerate && p.status === "ACTIVA" && (
                  <button onClick={renew} className="btn btn-outline">
                    <RefreshCw size={16} /> Renovar 7 días
                  </button>
                )}
                {canModerate && (
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      setEditing(true);
                    }}
                    className="btn btn-outline"
                  >
                    <Pencil size={16} /> Editar
                  </button>
                )}
                {canModerate && (
                  <button onClick={remove} className="btn btn-danger">
                    <Trash2 size={16} /> Eliminar
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

function PostForm({ userId, isAdmin, onDone }: { userId: string; isAdmin: boolean; onDone: () => void }) {
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
    if (isSale(type) && !isAdmin && !price) {
      setErr("El precio es obligatorio en las ventas.");
      return;
    }
    if (isTrade(type) && !tradeFor) {
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
      price: isSale(type) && price ? Number(price) : null,
      trade_for: isTrade(type) ? tradeFor : null,
      photo_urls,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold mb-2">¿Qué quieres publicar?</p>
        <div className="grid grid-cols-2 gap-2">
          {CREATE_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`btn ${type === t ? "btn-primary" : "btn-outline"}`}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">{TYPE_HINT[type]}</p>
      </div>

      <input required placeholder="Título (ej: Lote 5 Hot Wheels Mainline 2026)" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
      <textarea placeholder="Descripción (estado, cantidad, detalles del lote...)" value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={3} />
      {isSale(type) && (
        <input
          type="number"
          inputMode="numeric"
          placeholder={isAdmin ? "Precio en pesos (opcional para admin/tienda)" : "Precio en pesos (obligatorio)"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="input"
        />
      )}
      {isTrade(type) && (
        <input placeholder="¿Qué buscas a cambio? (nombre del auto o descripción)" value={tradeFor} onChange={(e) => setTradeFor(e.target.value)} className="input" />
      )}

      <PhotoPicker files={files} onFilesChange={setFiles} max={MAX_PHOTOS} />

      {err && <p className="text-flame text-sm">{err}</p>}
      <button disabled={saving} className="btn btn-primary w-full py-3 text-base">
        {saving ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
