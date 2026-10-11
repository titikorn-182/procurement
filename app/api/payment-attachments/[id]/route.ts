import { NextResponse } from "next/server";
import { attachmentBucket } from "@/app/lib/request-attachments";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "ไม่พบเอกสารแนบ" }, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { data: file, error } = await supabase
    .from("payment_attachments")
    .select("storage_path,file_name")
    .eq("id", id)
    .maybeSingle();
  if (error || !file)
    return NextResponse.json({ error: "ไม่พบเอกสารหรือไม่มีสิทธิ์เข้าถึง" }, { status: 404 });
  const { data, error: storageError } = await supabase.storage
    .from(attachmentBucket)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });
  if (storageError || !data)
    return NextResponse.json({ error: "เตรียมไฟล์ไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
