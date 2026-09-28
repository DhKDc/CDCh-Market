"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { COMMUNITY_NAME, WHATSAPP_GROUP_LINK, usernameToSyntheticEmail, usernameToSlug } from "../lib/config";
import { normalizePhone, isValidChileanMobile } from "../lib/format";
import ThemeToggle from "../components/ThemeToggle";

export default function AuthForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const typed = username.trim();
    // Cuentas antiguas (creadas con correo real) entran escribiendo su correo completo.
    const isLegacyEmail = mode === "login" && typed.includes("@");
    const email = isLegacyEmail ? typed : usernameToSyntheticEmail(typed);

    if (mode === "signup") {
      if (typed.includes("@") || usernameToSlug(typed).length < 3) {
        setLoading(false);
        setMsg("El usuario debe tener al menos 3 letras o números y no puede tener @.");
        return;
      }
      if (!isValidChileanMobile(phone)) {
        setLoading(false);
        setMsg("Ingresa un número chileno válido, ej: +56 9 1234 5678.");
        return;
      }
      // Revisa antes si el nombre ya existe (sin distinguir mayúsculas).
      const pattern = typed.replace(/[\\%_]/g, "\\$&");
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", pattern)
        .limit(1);
      if (taken && taken.length > 0) {
        setLoading(false);
        setMsg("Ese nombre de usuario ya existe. Prueba con otro.");
        return;
      }
    }

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: typed, phone: normalizePhone(phone) } },
          });

    setLoading(false);
    if (error) {
      // "User already registered" -> el username ya existe
      if (error.message.toLowerCase().includes("already registered")) {
        setMsg("Ese nombre de usuario ya existe. Prueba con otro.");
      } else if (mode === "login" && error.message.toLowerCase().includes("invalid login")) {
        setMsg("Usuario o contraseña incorrectos.");
      } else if (error.message.toLowerCase().includes("database error")) {
        setMsg("No se pudo crear la cuenta. Es probable que ese nombre de usuario ya esté en uso; prueba con otro.");
      } else if (error.message.toLowerCase().includes("is invalid")) {
        setMsg("Supabase rechazó el correo interno de la app. El admin debe definir NEXT_PUBLIC_AUTH_EMAIL_DOMAIN con un dominio válido (ver README).");
      } else {
        setMsg(error.message);
      }
      return;
    }
    if (mode === "signup") {
      setMsg(
        `Cuenta creada. Un administrador revisará tu número de teléfono contra el grupo "${COMMUNITY_NAME}" antes de habilitarte para publicar.`
      );
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 bg-white dark:bg-slate-800 p-6 rounded-xl relative">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <h1 className="text-xl font-bold mb-1 text-center">Culture Diecast Chile Market</h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
        Compra, vende y permuta con la comunidad
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
          type="text"
          placeholder={mode === "login" ? "Usuario (o tu correo, si tu cuenta es antigua)" : "Nombre de usuario"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          autoCapitalize="none"
        />
        <input
          className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {mode === "signup" && (
          <input
            className="bg-slate-100 dark:bg-slate-900 rounded px-3 py-2"
            type="tel"
            placeholder="Teléfono (el mismo del grupo, ej: +56 9 1234 5678)"
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
            className="text-xs text-green-600 dark:text-green-400 underline text-center"
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
      {msg && <p className="text-sm text-amber-600 dark:text-amber-300 mt-3">{msg}</p>}
      <button
        className="text-sm text-slate-500 dark:text-slate-400 mt-4 underline w-full text-center"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "¿Nuevo? Crea una cuenta" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </div>
  );
}
