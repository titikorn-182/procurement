"use client";
import { createClient } from "@/lib/supabase/client";
import {
  attachmentBucket,
  requestAttachmentPath,
  validateAttachmentCandidates,
  type AttachmentCandidate,
  type SelectedAttachment,
} from "@/app/lib/request-attachments";

/** Only explicit TOR IDs are replaced/removed. Manual attachments are never selected by filename. */
export async function syncTorAttachments(
  requestId: string,
  files: SelectedAttachment[],
  previousIds: string[] = [],
) {
  try {
    return await syncFiles(requestId, files, previousIds);
  } catch {
    return { error: "เชื่อมต่อหรือบันทึกไฟล์ TOR ไม่สำเร็จ ข้อมูลคำขอยังอยู่ กรุณาลองใหม่" };
  }
}

async function syncFiles(requestId: string, files: SelectedAttachment[], previousIds: string[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };
  const paths = files.map((file) => requestAttachmentPath(requestId, file));
  const oldPaths = previousIds.map((id) =>
    requestAttachmentPath(requestId, { id, file: new File([""], "TOR.pdf") }),
  );
  const { data: existing, error: readError } = await supabase
    .from("request_attachments")
    .select("storage_path,file_name,size_bytes,mime_type")
    .eq("request_id", requestId);
  if (readError) return { error: "ตรวจสอบไฟล์ TOR ไม่สำเร็จ กรุณาลองใหม่" };
  const retained = (existing ?? []).filter(
    (a) => !paths.includes(a.storage_path) && !oldPaths.includes(a.storage_path),
  );
  const retainedFiles: AttachmentCandidate[] = [];
  for (const attachment of retained) {
    if (attachment.size_bytes === null) {
      return { error: "ข้อมูลขนาดไฟล์แนบเดิมไม่ครบถ้วน กรุณาแจ้งผู้ดูแลระบบตรวจสอบก่อนแนบ TOR" };
    }
    retainedFiles.push({
      name: attachment.file_name,
      size: attachment.size_bytes,
      type: attachment.mime_type ?? "",
    });
  }
  const validation = validateAttachmentCandidates([...retainedFiles, ...files.map((f) => f.file)]);
  if (validation) return { error: validation };
  for (const [index, selection] of files.entries()) {
    const storagePath = paths[index];
    const { error: uploadError } = await supabase.storage
      .from(attachmentBucket)
      .upload(storagePath, selection.file, { contentType: "application/pdf", upsert: true });
    if (uploadError)
      return { error: "อัปโหลด TOR ไม่สำเร็จ ข้อมูลคำขอยังอยู่ กรุณากดส่งใหม่เพื่อลองอีกครั้ง" };
    const { error: metadataError } = await supabase.from("request_attachments").upsert(
      {
        request_id: requestId,
        storage_path: storagePath,
        file_name: selection.file.name,
        mime_type: "application/pdf",
        size_bytes: selection.file.size,
        uploaded_by: user.id,
      },
      { onConflict: "storage_path" },
    );
    // Never delete a previous valid PDF as rollback; retries use the same TOR IDs.
    if (metadataError) return { error: "บันทึกไฟล์ TOR ไม่สำเร็จ กรุณากดส่งใหม่เพื่อลองอีกครั้ง" };
  }
  const removed = oldPaths.filter((path) => !paths.includes(path));
  if (removed.length) {
    const { error } = await supabase
      .from("request_attachments")
      .delete()
      .eq("request_id", requestId)
      .eq("uploaded_by", user.id)
      .in("storage_path", removed);
    if (error) return { error: "นำ TOR เดิมออกไม่สำเร็จ กรุณาลองใหม่" };
    const { error: storageError } = await supabase.storage.from(attachmentBucket).remove(removed);
    if (storageError)
      return { error: "นำ TOR ออกจากคำขอแล้ว แต่ล้างไฟล์เก่าไม่สำเร็จ กรุณาลองใหม่" };
  }
  return { error: null };
}
