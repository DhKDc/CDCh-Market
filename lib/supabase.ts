import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);

export type PostType = "VENTA" | "PERMUTA" | "AMBOS" | "BUSCO";
export type PostStatus = "ACTIVA" | "VENDIDO";
export type ProfileStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export type Profile = {
  id: string;
  username: string;
  phone: string | null;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
};

export type PostProfile = { username: string; is_admin: boolean; phone: string | null };

export type Post = {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  description: string | null;
  price: number | null;
  trade_for: string | null;
  photo_urls: string[];
  status: PostStatus;
  created_at: string;
  expires_at: string;
  profiles?: PostProfile | null;
};

export type AnnouncementKind = "NOVEDAD" | "PROXIMAMENTE" | "PREVENTA" | "RIFA";

export type Announcement = {
  id: string;
  author_id: string;
  author_username?: string;
  kind: AnnouncementKind;
  title: string;
  body: string | null;
  photo_urls: string[];
  event_date: string | null;
  created_at: string;
  views_7d?: number;
};
