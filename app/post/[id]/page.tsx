"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, Post } from "../../../lib/supabase";
import ZoomableImage from "../../../components/ZoomableImage";
import { formatCLP } from "../../../lib/format";

const TYPE_LABEL: Record<string, string> = {
  VENTA: "Venta",
  PERMUTA: "Permuta",
  BUSCO: "Busco",
};

function waLink(phone: string, title: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(
    `Hola! Vi tu publicación "${title}" en Diecast Chile Market 🚗`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [post, setPost] = useState<Post | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("posts")
      .select("*, profiles(username, is_official, phone)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPost((data as any) || null));
  }, [id]);

  if (post === undefined) return null;

  if (!post) {
    return (
      <div className="max-w-md mx-auto mt-24 text-center p-6">
        <p className="text-4xl mb-3">🤷</p>
        <h1 className="font-bold mb-2">Publicación no disponible</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Puede que ya haya expirado, se haya eliminado, o que necesites iniciar sesión para verla.
        </p>
        <a href="/" className="text-amber-600 dark:text-amber-400 underline">
          Ir a Diecast Chile Market
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <a href="/" className="text-sm text-slate-500 dark:text-slate-400 underline">
        ← Ver todas las publicaciones
      </a>
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden mt-3 border border-slate-200 dark:border-transparent">
        {post.photo_urls?.length > 0 && (
          <div className="flex gap-1 overflow-x-auto bg-slate-100 dark:bg-slate-900">
            {post.photo_urls.map((u, i) => (
              <ZoomableImage
                key={i}
                src={u}
                alt={`${post.title} (${i + 1}/${post.photo_urls.length})`}
                className={
                  post.photo_urls.length === 1
                    ? "w-full max-h-96 object-contain"
                    : "h-72 w-auto max-w-none object-contain flex-none"
                }
              />
            ))}
          </div>
        )}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold">
              {TYPE_LABEL[post.type]}
              {post.profiles?.is_official ? " · Tienda/Admin" : ""}
            </span>
            {post.status === "VENDIDO" && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">VENDIDO</span>
            )}
          </div>
          <h1 className="text-lg font-bold mt-1">{post.title}</h1>
          {post.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{post.description}</p>
          )}
          {post.price != null && (
            <p className="text-amber-600 dark:text-amber-300 font-bold text-lg mt-2">
              {formatCLP(post.price)}
            </p>
          )}
          {post.trade_for && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              🔁 Busca: {post.trade_for}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-3">
            por {post.profiles?.username || "usuario"} · vence{" "}
            {new Date(post.expires_at).toLocaleDateString("es-CL")}
          </p>
          {post.profiles?.phone && (
            <a
              href={waLink(post.profiles.phone, post.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold"
            >
              📱 Contactar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
