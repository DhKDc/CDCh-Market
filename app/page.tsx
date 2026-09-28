"use client";
import { useEffect, useState } from "react";
import { supabase, Profile } from "../lib/supabase";
import { COMMUNITY_NAME } from "../lib/config";
import AuthForm from "../components/AuthForm";
import Marketplace from "../components/Marketplace";

export default function Home() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => setProfile(data as Profile));
  }, [userId]);

  if (userId === undefined) return null;
  if (!userId) return <AuthForm />;
  if (!profile) return null;

  if (profile.status === "PENDIENTE") {
    return (
      <div className="card max-w-sm mx-auto mt-24 text-center p-6">
        <p className="text-4xl mb-3">⏳</p>
        <h1 className="font-bold mb-2">Cuenta pendiente de aprobación</h1>
        <p className="text-sm text-muted">
          Un administrador está revisando tu número de teléfono contra la lista del grupo{" "}
          {COMMUNITY_NAME}. Te avisaremos cuando puedas publicar.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-muted underline mt-4"
        >
          Salir
        </button>
      </div>
    );
  }

  if (profile.status === "RECHAZADO") {
    return (
      <div className="card max-w-sm mx-auto mt-24 text-center p-6">
        <p className="text-4xl mb-3">🚫</p>
        <h1 className="font-bold mb-2">Solicitud no aprobada</h1>
        <p className="text-sm text-muted">
          No pudimos verificar tu número contra el grupo de WhatsApp. Contacta a un administrador
          si crees que es un error.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-muted underline mt-4"
        >
          Salir
        </button>
      </div>
    );
  }

  return <Marketplace userId={userId} isOfficial={profile.is_official} isAdmin={profile.is_admin} />;
}
