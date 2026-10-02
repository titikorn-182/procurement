import { NextResponse } from "next/server";
import { attachmentBucket } from "@/app/lib/request-attachments";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "ไม่พบเอกสารแนบ" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: attachment, error } = await supabase
    .from("request_attachments")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  if (error || !attachment) {
    return NextResponse.json({ error: "ไม่พบเอกสารแนบหรือไม่มีสิทธิ์เข้าถึง" }, { status: 404 });
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(attachmentBucket)
    .createSignedUrl(attachment.storage_path, 60, { download: attachment.file_name });
  if (signedUrlError || !signedUrl) {
    return NextResponse.json({ error: "ไม่สามารถเตรียมไฟล์ดาวน์โหลดได้" }, { status: 503 });
  }

  return NextResponse.redirect(signedUrl.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
