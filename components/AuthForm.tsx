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

    const { data, error } =
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
      } else if (error.message.toLowerCase().includes("rate limit")) {
        setMsg(
          "Supabase está limitando el envío de correos de confirmación. Casi seguro \"Confirm email\" sigue activado: el admin debe desactivarlo en Supabase (Authentication → Providers → Email)."
        );
      } else if (error.message.toLowerCase().includes("database error")) {
        setMsg("No se pudo crear la cuenta. Es probable que ese nombre de usuario ya esté en uso; prueba con otro.");
      } else if (error.message.toLowerCase().includes("is invalid")) {
        setMsg("Supabase rechazó el correo interno de la app. El admin debe definir NEXT_PUBLIC_AUTH_EMAIL_DOMAIN con un dominio válido (ver README).");
      } else {
        setMsg(error.message);
      }
      return;
    }
    // Sin sesión tras registrarse = Supabase sigue exigiendo confirmar el correo.
    if (mode === "signup" && !data?.session) {
      setMsg(
        "La cuenta se creó, pero Supabase está pidiendo confirmar un correo que no existe. El admin debe desactivar \"Confirm email\" en Supabase (Authentication → Providers → Email) y luego ejecutar el SQL del README para habilitar cuentas ya creadas."
      );
      return;
    }
    if (mode === "signup") {
      setMsg(
        `Cuenta creada. Un administrador revisará tu número de teléfono contra el grupo "${COMMUNITY_NAME}" antes de habilitarte para publicar.`
      );
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-10">
      <div className="flex items-center justify-between mb-10">
        <span className="text-flame font-extrabold italic uppercase leading-none tracking-tight">
          Culture Diecast Chile
        </span>
        <ThemeToggle />
      </div>

      <h1 className="page-title mb-2">
        {mode === "login" ? "Entrar" : "Crear cuenta"}
      </h1>
      <p className="text-muted mb-6">Compra, vende y permuta con la comunidad.</p>

      <div className="segmented mb-5">
        <button
          type="button"
          onClick={() => { setMode("login"); setMsg(null); }}
          className={`seg-item ${mode === "login" ? "seg-item-on" : ""}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => { setMode("signup"); setMsg(null); }}
          className={`seg-item ${mode === "signup" ? "seg-item-on" : ""}`}
        >
          Crear cuenta
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="input"
          type="text"
          placeholder={mode === "login" ? "Usuario (o tu correo, si tu cuenta es antigua)" : "Nombre de usuario"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          autoCapitalize="none"
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {mode === "signup" && (
          <input
            className="input"
            type="tel"
            placeholder="Teléfono del grupo, ej: +56 9 1234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        )}
        {mode === "signup" && (
          <p className="text-xs text-muted">
            Un administrador revisará que tu número esté en el grupo de WhatsApp antes de
            habilitarte para publicar.{" "}
            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-text font-semibold underline"
            >
              ¿Aún no estás? Únete a {COMMUNITY_NAME}
            </a>
          </p>
        )}
        <button disabled={loading} className="btn btn-primary w-full py-3 text-base mt-1">
          {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {msg && <p className="text-sm text-flame mt-4">{msg}</p>}

      <a href="/info" className="block text-center text-sm text-muted underline mt-8">
        Información, reglas y cómo usar la app
      </a>
    </div>
  );
}
