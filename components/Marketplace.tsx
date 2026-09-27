"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase, Post, PostType } from "@/lib/supabase";

const TYPES: PostType[] = ["VENTA", "PERMUTA", "CACERIA", "BUSCO", "EXPO"];
const TYPE_LABEL: Record<PostType, string> = {
  VENTA: "Venta",
  PERMUTA: "Permuta",
  CACERIA: "Cacería",
  BUSCO: "Busco",
  EXPO: "Expo",
};

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

// Arma el link de WhatsApp con el número del vendedor y un mensaje precargado.
function waLink(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hola! Vi tu publicación "${title}" en Diecast Chile Market 🚗`
  );
  return `https://wa.me/${digits}?text=${text}`;
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ventasHoy, setVentasHoy] = useState(0);

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

  async function markSold(id: string) {
    await supabase.from("posts").update({ status: "VENDIDO" }).eq("id", id);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">🚗 Diecast Chile Market</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/admin" className="text-sm text-amber-400 underline">
              Panel admin
            </a>
          )}
          <button onClick={logout} className="text-sm text-slate-400 underline">
            Salir
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {(["TODAS", ...TYPES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t as any)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === t ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-800"
            }`}
          >
            {t === "TODAS" ? "Todas" : TYPE_LABEL[t as PostType]}
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full mb-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg py-2"
      >
        {showForm ? "Cancelar" : "+ Nueva publicación"}
      </button>

      {!(isOfficial || isAdmin) && (
        <p className="text-xs text-slate-400 mb-3">
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

      {loading && <p className="text-slate-400">Cargando...</p>}

      <div className="flex flex-col gap-3 mt-2">
        {posts.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-xl overflow-hidden">
            {p.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt={p.title} className="w-full max-h-80 object-cover" />
            )}
            <div className="p-3">
              <div className="flex justify-between items-start">
                <span className="text-xs uppercase tracking-wide text-amber-400 font-bold">
                  {TYPE_LABEL[p.type]}
                  {p.profiles?.is_official ? " · Tienda/Admin" : ""}
                </span>
                {p.status === "VENDIDO" && (
                  <span className="text-xs bg-red-600 px-2 py-0.5 rounded">VENDIDO</span>
                )}
              </div>
              <h3 className="font-semibold mt-1">{p.title}</h3>
              {p.description && <p className="text-sm text-slate-300 mt-1">{p.description}</p>}
              {p.price != null && (
                <p className="text-amber-300 font-bold mt-1">${p.price.toLocaleString("es-CL")}</p>
              )}
              {p.trade_for && (
                <p className="text-sm text-slate-300 mt-1">🔁 Busca: {p.trade_for}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                por {p.profiles?.username || "usuario"} · vence{" "}
                {new Date(p.expires_at).toLocaleDateString("es-CL")}
              </p>
              {p.user_id !== userId && p.profiles?.phone && (
                <a
                  href={waLink(p.profiles.phone, p.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs bg-green-600 hover:bg-green-500 px-3 py-1 rounded font-semibold"
                >
                  📱 Contactar por WhatsApp
                </a>
              )}
              {p.user_id === userId && p.status === "ACTIVA" && (
                <button
                  onClick={() => markSold(p.id)}
                  className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                >
                  Marcar como vendido
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && posts.length === 0 && (
          <p className="text-slate-500 text-center mt-6">No hay publicaciones aún.</p>
        )}
      </div>
    </div>
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
  const [file, setFile] = useState<File | null>(null);
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
    let photo_url: string | null = null;
    if (file) {
      const blob = await compressImage(file);
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("fotos").upload(path, blob, {
        contentType: "image/jpeg",
      });
      if (upErr) {
        setErr("No se pudo subir la foto: " + upErr.message);
        setSaving(false);
        return;
      }
      photo_url = supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      type,
      title,
      description: description || null,
      price: price ? Number(price) : null,
      trade_for: type === "PERMUTA" ? tradeFor : null,
      photo_url,
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
    <form onSubmit={submit} className="bg-slate-800 rounded-xl p-4 mb-4 flex flex-col gap-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PostType)}
        className="bg-slate-900 rounded px-3 py-2"
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
        className="bg-slate-900 rounded px-3 py-2"
      />
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-slate-900 rounded px-3 py-2"
      />
      {type === "VENTA" && (
        <input
          type="number"
          placeholder={isOfficial ? "Precio (opcional para tienda/admin)" : "Precio (obligatorio)"}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="bg-slate-900 rounded px-3 py-2"
        />
      )}
      {type === "PERMUTA" && (
        <input
          placeholder="¿Qué buscas a cambio?"
          value={tradeFor}
          onChange={(e) => setTradeFor(e.target.value)}
          className="bg-slate-900 rounded px-3 py-2"
        />
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-sm"
      />
      {err && <p className="text-red-400 text-sm">{err}</p>}
      <button
        disabled={saving}
        className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded py-2"
      >
        {saving ? "Publicando..." : "Publicar"}
      </button>
    </form>
  );
}
