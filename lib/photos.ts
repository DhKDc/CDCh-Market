import { supabase } from "./supabase";

export const MAX_PHOTOS = 6;

// Reduce y comprime la imagen en el navegador antes de subirla.
async function compressImage(file: File, maxW = 1000, quality = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality));
}

export async function uploadPhotos(userId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const blob = await compressImage(file);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from("fotos").upload(path, blob, {
      contentType: "image/jpeg",
    });
    if (error) throw error;
    urls.push(supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
