"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase, Profile } from "../../lib/supabase";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK } from "../../lib/config";

export default function AdminPage() {
  const [me, setMe] = useState<Profile | null | undefined>(undefined);
  const [pendientes, setPendientes] = useState<Profile[]>([]);
  const [todos, setTodos] = useState<Profile[]>([]);
  const [tab, setTab] = useState<"pendientes" | "todos">("pendientes");

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

  if (me === undefined) return null;
  if (!me?.is_admin) {
    return <p className="text-center mt-20 text-slate-400">No tienes acceso a esta página.</p>;
  }

  const lista = tab === "pendientes" ? pendientes : todos;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Panel de administración</h1>
        <a href="/" className="text-sm text-slate-400 underline">
          Volver al market
        </a>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("pendientes")}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === "pendientes" ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-800"
          }`}
        >
          Pendientes ({pendientes.length})
        </button>
        <button
          onClick={() => setTab("todos")}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === "todos" ? "bg-amber-500 text-slate-900 font-semibold" : "bg-slate-800"
          }`}
        >
          Todos los usuarios
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Revisa que cada teléfono esté en tu{" "}
        <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer" className="underline text-green-400">
          lista del grupo {COMMUNITY_NAME}
        </a>{" "}
        antes de aprobar.
      </p>
      <div className="flex flex-col gap-2">
        {lista.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold">{p.username}</p>
              <p className="text-sm text-amber-300">{p.phone || "sin teléfono"}</p>
              <p className="text-xs text-slate-500">
                {p.status} · registrado {new Date(p.created_at).toLocaleDateString("es-CL")}
              </p>
            </div>
            {p.status !== "APROBADO" && (
              <button
                onClick={() => setStatus(p.id, "APROBADO")}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded"
              >
                Aprobar
              </button>
            )}
            {p.status !== "RECHAZADO" && (
              <button
                onClick={() => setStatus(p.id, "RECHAZADO")}
                className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1 rounded ml-2"
              >
                Rechazar
              </button>
            )}
          </div>
        ))}
        {lista.length === 0 && (
          <p className="text-slate-500 text-center mt-6">Nada por aquí.</p>
        )}
      </div>
    </div>
  );
}
