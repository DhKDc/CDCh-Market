import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey);

export type PostType = "VENTA" | "PERMUTA" | "CACERIA" | "BUSCO" | "EXPO";
export type PostStatus = "ACTIVA" | "VENDIDO";
export type ProfileStatus = "PENDIENTE" | "APROBADO" | "RECHAZADO";

export type Profile = {
  id: string;
  username: string;
  phone: string | null;
  status: ProfileStatus;
  is_official: boolean;
  is_admin: boolean;
  created_at: string;
};

export type PostProfile = { username: string; is_official: boolean; phone: string | null };

export type Post = {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  description: string | null;
  price: number | null;
  trade_for: string | null;
  photo_url: string | null;
  status: PostStatus;
  created_at: string;
  expires_at: string;
  profiles?: PostProfile | null;
};
