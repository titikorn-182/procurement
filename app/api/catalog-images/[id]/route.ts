import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATALOG_IMAGE_MAX_BYTES, catalogImagePathSchema } from "@/app/catalog/schema";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};

/** Resolve the current image through the same visibility rules as the catalog. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404, headers });
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return new Response(null, { status: 401, headers });
    const { data: path, error } = await supabase.rpc("catalog_image_path", { item_uuid: id });
    if (error || !catalogImagePathSchema.safeParse(path).success)
      return new Response(null, { status: 404, headers });
    const { data: image, error: imageError } = await supabase.storage
      .from("catalog-images")
      .download(path);
    if (
      imageError ||
      !image ||
      image.size < 1 ||
      image.size > CATALOG_IMAGE_MAX_BYTES ||
      !["image/png", "image/jpeg", "image/webp"].includes(image.type)
    )
      return new Response(null, { status: 404, headers });
    return new Response(image, { headers: { ...headers, "Content-Type": image.type } });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
