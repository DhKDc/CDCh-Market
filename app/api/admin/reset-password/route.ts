import { createClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de leer por WhatsApp.
const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function tempPassword(len = 10) {
  let out = "";
  for (let i = 0; i < len; i++) out += CHARS[randomInt(CHARS.length)];
  return out;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 500 }
    );
  }

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) Verifica en el servidor que quien llama es admin del sitio.
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData?.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  const { data: caller } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .single();
  if (!caller?.is_admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  // 2) Genera y aplica una contraseña temporal.
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ password });
}
