"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase, Profile, Post } from "../../lib/supabase";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK } from "../../lib/config";
import { displayPhone } from "../../lib/format";
import { TYPE_LABEL, isSale, isTrade } from "../../lib/postTypes";
import ThemeToggle from "../../components/ThemeToggle";
import AdminAnnouncements from "../../components/AdminAnnouncements";
import { ArrowLeft, MessageCircle, KeyRound, Pencil, Trash2, RefreshCw } from "lucide-react";


export default function AdminPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [pendientes, setPendientes] = useState<Profile[]>([]);
  const [todos, setTodos] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"pendientes" | "todos" | "publicaciones" | "novedades">("pendientes");
  const [resetInfo, setResetInfo] = useState<{ username: string; phone: string | null; password: string } | null>(null);
  const [justApproved, setJustApproved] = useState<Profile | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("status", "PENDIENTE")
      .order("created_at", { ascending: true });
    setPendientes((p as Profile[]) || []);
    const { data: t } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setTodos((t as Profile[]) || []);
    const { data: posts } = await supabase
      .from("posts")
      .select("*, profiles(username, is_admin, phone)")
      .order("created_at", { ascending: false });
    setPosts((posts as any) || []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setMe(null);
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();
      setMe((prof as Profile) || null);
    });
  }, []);

  useEffect(() => {
    if (me?.is_admin) load();
  }, [me, load]);

  async function setStatus(id: string, status: "APROBADO" | "RECHAZADO") {
    await supabase.from("profiles").update({ status }).eq("id", id);
    load();
  }

  async function approve(p: Profile) {
    await setStatus(p.id, "APROBADO");
    setJustApproved(p);
  }

  async function toggleAdmin(p: Profile) {
    if (p.id === me?.id && p.is_admin) {
      if (!confirm("Te vas a quitar el rol de admin a ti mismo. ¿Continuar?")) return;
    }
    await supabase.from("profiles").update({ is_admin: !p.is_admin }).eq("id", p.id);
    load();
  }

  // Abre WhatsApp con un mensaje listo para el usuario.
  function waTo(phone: string | null, text: string) {
    if (!phone) return;
    const digits = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, "_blank");
  }

  function notifyApproved(p: Profile) {
    waTo(
      p.phone,
      `Hola ${p.username}! Ya aprobé tu cuenta en Culture Diecast Chile Market 🚗 Puedes entrar y publicar aquí: ${window.location.origin}`
    );
  }

  async function resetPassword(p: Profile) {
    if (!confirm(`¿Generar una contraseña temporal nueva para ${p.username}? La anterior dejará de funcionar.`)) return;
    setResetErr(null);
    setResetInfo(null);
    const { data: sess } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session?.access_token}`,
      },
      body: JSON.stringify({ userId: p.id }),
    });
    const json = await res.json();
    if (!res.ok) return setResetErr(json.error || "No se pudo resetear la contraseña.");
    setResetInfo({ username: p.username, phone: p.phone, password: json.password });
  }

  if (me === undefined) return null;
  if (!me?.is_admin) {
    return (
      <p className="text-center mt-20 text-muted">
        No tienes acceso a esta página.
      </p>
    );
  }

  const lista = tab === "pendientes" ? pendientes : todos;

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "pendientes", label: `Pendientes (${pendientes.length})` },
    { key: "todos", label: "Usuarios" },
    { key: "publicaciones", label: `Publicaciones (${posts.length})` },
    { key: "novedades", label: "Novedades" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-12">
      <div className="flex items-center justify-between mb-6">
        <a href="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Volver
        </a>
        <ThemeToggle />
      </div>
      <h1 className="page-title mb-5">Admin</h1>

      <div className="segmented mb-5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`seg-item whitespace-nowrap px-4 text-sm ${tab === t.key ? "seg-item-on" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === "pendientes" || tab === "todos") && (
        <p className="text-xs text-muted mb-3">
          Revisa que cada teléfono esté en la{" "}
          <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer" className="text-brand-text font-semibold underline">
            lista del grupo {COMMUNITY_NAME}
          </a>{" "}
          antes de aprobar.
        </p>
      )}

      {justApproved && (
        <div className="card border-brand p-3 mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span>
            <b>{justApproved.username}</b> aprobado.
          </span>
          {justApproved.phone && (
            <button onClick={() => notifyApproved(justApproved)} className="btn btn-primary !py-1.5">
              <MessageCircle size={15} /> Avisarle por WhatsApp
            </button>
          )}
          <button onClick={() => setJustApproved(null)} className="btn !py-1.5">
            Cerrar
          </button>
        </div>
      )}
      {resetErr && <p className="text-sm text-flame mb-3">{resetErr}</p>}
      {resetInfo && (
        <div className="card border-brand p-3 mb-3 text-sm">
          <p>
            Contraseña temporal de <b>{resetInfo.username}</b>:{" "}
            <code className="font-mono font-bold select-all">{resetInfo.password}</code>
          </p>
          <p className="text-xs text-muted mt-1">
            Solo se muestra ahora. Envíasela por WhatsApp y pídele que la cambie.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() =>
                waTo(
                  resetInfo.phone,
                  `Hola ${resetInfo.username}! Tu contraseña temporal en Culture Diecast Chile Market es: ${resetInfo.password} (usuario: ${resetInfo.username}). Entra en ${window.location.origin}`
                )
              }
              className="btn btn-primary !py-1.5"
            >
              <MessageCircle size={15} /> Enviar por WhatsApp
            </button>
            <button onClick={() => setResetInfo(null)} className="btn !py-1.5">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {(tab === "pendientes" || tab === "todos") && (
        <div className="flex flex-col gap-2">
          {lista.map((p) => (
            <div key={p.id} className="card p-3 flex flex-col gap-3">
              <div>
                <p className="font-bold">
                  {p.username}
                  {p.is_admin && <span className="chip-flame ml-2">Admin / tienda oficial</span>}
                </p>
                <p className="text-sm text-brand-text font-semibold">
                  {p.phone ? displayPhone(p.phone) : "sin teléfono"}
                </p>
                <p className="text-xs text-muted">
                  {p.status} · registrado {new Date(p.created_at).toLocaleDateString("es-CL")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status !== "APROBADO" && (
                  <button onClick={() => approve(p)} className="btn btn-primary !py-1.5">
                    Aprobar
                  </button>
                )}
                {p.status !== "RECHAZADO" && (
                  <button onClick={() => setStatus(p.id, "RECHAZADO")} className="btn btn-danger !py-1.5">
                    Rechazar
                  </button>
                )}
                <button onClick={() => toggleAdmin(p)} className="btn !py-1.5">
                  {p.is_admin ? "Quitar admin / tienda oficial" : "Hacer admin / tienda oficial"}
                </button>
                {p.status === "APROBADO" && p.phone && (
                  <button onClick={() => notifyApproved(p)} className="btn btn-outline !py-1.5">
                    <MessageCircle size={15} /> Avisar aprobación
                  </button>
                )}
                <button onClick={() => resetPassword(p)} className="btn btn-outline !py-1.5">
                  <KeyRound size={15} /> Resetear contraseña
                </button>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-muted text-center mt-6">Nada por aquí.</p>}
        </div>
      )}

      {tab === "publicaciones" && (
        <div className="flex flex-col gap-2">
          {posts.map((p) => (
            <AdminPostRow key={p.id} post={p} onChanged={load} />
          ))}
          {posts.length === 0 && <p className="text-muted text-center mt-6">No hay publicaciones.</p>}
        </div>
      )}

      {tab === "novedades" && <AdminAnnouncements userId={me.id} />}
    </div>
  );
}

function AdminPostRow({ post: p, onChanged }: { post: Post; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(p.title);
  const [description, setDescription] = useState(p.description || "");
  const [price, setPrice] = useState(p.price != null ? String(p.price) : "");
  const [tradeFor, setTradeFor] = useState(p.trade_for || "");
  const [saving, setSaving] = useState(false);

  async function remove() {
    if (!confirm(`¿Eliminar "${p.title}" de ${p.profiles?.username || "usuario"}?`)) return;
    await supabase.from("posts").delete().eq("id", p.id);
    onChanged();
  }

  async function toggleSold() {
    await supabase
      .from("posts")
      .update({ status: p.status === "ACTIVA" ? "VENDIDO" : "ACTIVA" })
      .eq("id", p.id);
    onChanged();
  }

  async function renew() {
    const expires_at = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await supabase.from("posts").update({ expires_at }).eq("id", p.id);
    onChanged();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("posts")
      .update({
        title,
        description: description || null,
        price: isSale(p.type) && price ? Number(price) : null,
        trade_for: isTrade(p.type) ? tradeFor || null : null,
      })
      .eq("id", p.id);
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="card border-brand p-3 flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={3} />
        {isSale(p.type) && (
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Precio" className="input" />
        )}
        {isTrade(p.type) && (
          <input value={tradeFor} onChange={(e) => setTradeFor(e.target.value)} placeholder="¿Qué busca a cambio?" className="input" />
        )}
        <div className="flex gap-2">
          <button disabled={saving} className="btn btn-primary flex-1">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn flex-1">
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card p-3 flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap gap-1.5 mb-1">
          <span className="chip-blue">{TYPE_LABEL[p.type]}</span>
          {p.status === "VENDIDO" && <span className="chip-flame">Vendido</span>}
        </div>
        <p className="font-bold leading-tight">{p.title}</p>
        <p className="text-xs text-muted">
          @{p.profiles?.username || "usuario"} · vence {new Date(p.expires_at).toLocaleDateString("es-CL")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={toggleSold} className="btn !py-1.5">
          {p.status === "ACTIVA" ? "Marcar vendido" : "Reactivar"}
        </button>
        <button onClick={renew} className="btn btn-outline !py-1.5">
          <RefreshCw size={15} /> Renovar 7 días
        </button>
        <button onClick={() => setEditing(true)} className="btn btn-outline !py-1.5">
          <Pencil size={15} /> Editar
        </button>
        <button onClick={remove} className="btn btn-danger !py-1.5">
          <Trash2 size={15} /> Eliminar
        </button>
      </div>
    </div>
  );
}
