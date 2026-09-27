"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase, Profile, Post } from "../../lib/supabase";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK } from "../../lib/config";
import ThemeToggle from "../../components/ThemeToggle";

const TYPE_LABEL: Record<string, string> = {
  VENTA: "Venta",
  PERMUTA: "Permuta",
  CACERIA: "Cacería",
  BUSCO: "Busco",
  EXPO: "Expo",
};

export default function AdminPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [pendientes, setPendientes] = useState<Profile[]>([]);
  const [todos, setTodos] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"pendientes" | "todos" | "publicaciones">("pendientes");

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
      .select("*, profiles(username, is_official, phone)")
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

  async function toggleFlag(p: Profile, field: "is_official" | "is_admin") {
    if (field === "is_admin" && p.id === me?.id && p.is_admin) {
      if (!confirm("Te vas a quitar el permiso de admin del sitio a ti mismo. ¿Continuar?")) return;
    }
    await supabase.from("profiles").update({ [field]: !p[field] }).eq("id", p.id);
    load();
  }

  if (me === undefined) return null;
  if (!me?.is_admin) {
    return (
      <p className="text-center mt-20 text-slate-500 dark:text-slate-400">
        No tienes acceso a esta página.
      </p>
    );
  }

  const lista = tab === "pendientes" ? pendientes : todos;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Panel de administración</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/" className="text-sm text-slate-500 dark:text-slate-400 underline">
            Volver al market
          </a>
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setTab("pendientes")}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === "pendientes" ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-200 dark:bg-slate-800"
          }`}
        >
          Pendientes ({pendientes.length})
        </button>
        <button
          onClick={() => setTab("todos")}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === "todos" ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-200 dark:bg-slate-800"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setTab("publicaciones")}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === "publicaciones" ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-200 dark:bg-slate-800"
          }`}
        >
          Publicaciones ({posts.length})
        </button>
      </div>

      {tab !== "publicaciones" && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Revisa que cada teléfono esté en tu{" "}
          <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer" className="underline text-green-600 dark:text-green-400">
            lista del grupo {COMMUNITY_NAME}
          </a>{" "}
          antes de aprobar.
        </p>
      )}

      {tab !== "publicaciones" && (
        <div className="flex flex-col gap-2">
          {lista.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-transparent flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
            >
              <div>
                <p className="font-semibold">
                  {p.username}
                  {p.is_official && (
                    <span className="ml-2 text-[10px] bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded font-bold">
                      TIENDA/ADMIN GRUPO
                    </span>
                  )}
                  {p.is_admin && (
                    <span className="ml-2 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">
                      ADMIN DEL SITIO
                    </span>
                  )}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-300">{p.phone || "sin teléfono"}</p>
                <p className="text-xs text-slate-500">
                  {p.status} · registrado {new Date(p.created_at).toLocaleDateString("es-CL")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status !== "APROBADO" && (
                  <button
                    onClick={() => setStatus(p.id, "APROBADO")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded"
                  >
                    Aprobar
                  </button>
                )}
                {p.status !== "RECHAZADO" && (
                  <button
                    onClick={() => setStatus(p.id, "RECHAZADO")}
                    className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Rechazar
                  </button>
                )}
                <button
                  onClick={() => toggleFlag(p, "is_official")}
                  className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
                >
                  {p.is_official ? "Quitar tienda/admin grupo" : "Marcar tienda/admin grupo"}
                </button>
                <button
                  onClick={() => toggleFlag(p, "is_admin")}
                  className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
                >
                  {p.is_admin ? "Quitar admin del sitio" : "Hacer admin del sitio"}
                </button>
              </div>
            </div>
          ))}
          {lista.length === 0 && (
            <p className="text-slate-500 text-center mt-6">Nada por aquí.</p>
          )}
        </div>
      )}

      {tab === "publicaciones" && (
        <div className="flex flex-col gap-2">
          {posts.map((p) => (
            <AdminPostRow key={p.id} post={p} onChanged={load} />
          ))}
          {posts.length === 0 && (
            <p className="text-slate-500 text-center mt-6">No hay publicaciones.</p>
          )}
        </div>
      )}
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

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("posts")
      .update({
        title,
        description: description || null,
        price: price ? Number(price) : null,
        trade_for: p.type === "PERMUTA" ? tradeFor || null : p.trade_for,
      })
      .eq("id", p.id);
    setSaving(false);
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <form
        onSubmit={saveEdit}
        className="bg-white dark:bg-slate-800 rounded-lg p-3 flex flex-col gap-2 border border-amber-500"
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
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-transparent flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold">
          {TYPE_LABEL[p.type]}
          {p.status === "VENDIDO" ? " · VENDIDO" : ""}
        </p>
        <p className="font-semibold">{p.title}</p>
        <p className="text-xs text-slate-500">
          por {p.profiles?.username || "usuario"} · vence{" "}
          {new Date(p.expires_at).toLocaleDateString("es-CL")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleSold}
          className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
        >
          {p.status === "ACTIVA" ? "Marcar vendido" : "Reactivar"}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded"
        >
          ✏️ Editar
        </button>
        <button
          onClick={remove}
          className="text-xs bg-red-600/10 text-red-600 dark:text-red-400 px-3 py-1 rounded"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
}
