import type { SupabaseServerClient } from "@/lib/auth";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024;

/** Envia uma imagem para o bucket "produtos" na pasta do usuário. Retorna a URL pública ou null. */
export async function uploadImage(
  supabase: SupabaseServerClient,
  userId: string,
  file: File | null | undefined,
  prefix: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = EXT[file.type];
  if (!ext || file.size > MAX_BYTES) return null;

  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("produtos").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return null;
  return supabase.storage.from("produtos").getPublicUrl(path).data.publicUrl;
}
