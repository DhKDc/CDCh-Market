"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { supabase, Post } from "../../../lib/supabase";
import { formatCLP } from "../../../lib/format";
import { TYPE_LABEL, contactLabel } from "../../../lib/postTypes";
import { waContactLink } from "../../../lib/whatsapp";
import Gallery from "../../../components/Gallery";
import ThemeToggle from "../../../components/ThemeToggle";

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("posts")
      .select("*, profiles(username, is_admin, phone)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPost((data as any) || null));
  }, [id]);

  if (post === undefined) return null;

  if (!post) {
    return (
      <div className="card max-w-md mx-auto mt-24 text-center p-6">
        <h1 className="text-2xl mb-2">Publicación no disponible</h1>
        <p className="text-sm text-muted mb-5">
          Puede que ya haya expirado, se haya vendido o eliminado, o que necesites iniciar sesión
          para verla.
        </p>
        <a href="/" className="btn btn-primary">
          Ir a Culture Diecast Chile Market
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <a href="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Ver todas
        </a>
        <ThemeToggle />
      </div>
      <div className="card p-4">
        <Gallery urls={post.photo_urls || []} alt={post.title} ratio="aspect-square" />
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="chip-blue">{TYPE_LABEL[post.type]}</span>
            {post.profiles?.is_admin && <span className="tagchip">Tienda</span>}
            {post.status === "VENDIDO" && <span className="chip-flame">Vendido</span>}
          </div>
          <h1 className="text-2xl leading-tight mt-2">{post.title}</h1>
          {post.price != null && (
            <p className="text-2xl font-extrabold text-brand-text mt-2">{formatCLP(post.price)}</p>
          )}
          {post.description && (
            <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{post.description}</p>
          )}
          {post.trade_for && (
            <p className="text-sm mt-3">
              <span className="text-muted">Busca a cambio: </span>
              {post.trade_for}
            </p>
          )}
          <p className="text-xs text-muted mt-3">
            @{post.profiles?.username || "usuario"} · vence{" "}
            {new Date(post.expires_at).toLocaleDateString("es-CL")}
          </p>
          {post.profiles?.phone && (
            <a
              href={waContactLink(post.profiles.phone, post.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full mt-4"
            >
              <MessageCircle size={16} /> {contactLabel(post.type)}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
