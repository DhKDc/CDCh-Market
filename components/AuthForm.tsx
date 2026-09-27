"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK } from "@/lib/config";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { phone } },
          });
    setLoading(false);
    if (error) setMsg(error.message);
    else if (mode === "signup")
      setMsg(
        `Cuenta creada. Un administrador revisará tu número de teléfono contra el grupo "${COMMUNITY_NAME}" antes de habilitarte para publicar.`
      );
  }

  return (
    <div className="max-w-sm mx-auto mt-20 bg-slate-800 p-6 rounded-xl">
      <h1 className="text-xl font-bold mb-1 text-center">Diecast Chile Market</h1>
      <p className="text-xs text-slate-400 text-center mb-4">
        Comunidad {COMMUNITY_NAME}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="bg-slate-900 rounded px-3 py-2"
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="bg-slate-900 rounded px-3 py-2"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {mode === "signup" && (
          <input
            className="bg-slate-900 rounded px-3 py-2"
            type="tel"
            placeholder="Teléfono (el mismo del grupo de WhatsApp, ej: +56912345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        )}
        {mode === "signup" && (
          <a
            href={WHATSAPP_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-400 underline text-center"
          >
            ¿Aún no estás en el grupo? Únete a {COMMUNITY_NAME}
          </a>
        )}
        <button
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 rounded py-2 font-semibold text-slate-900"
        >
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      {msg && <p className="text-sm text-amber-300 mt-3">{msg}</p>}
      <button
        className="text-sm text-slate-400 mt-4 underline w-full text-center"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "¿Nuevo? Crea una cuenta" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </div>
  );
}
