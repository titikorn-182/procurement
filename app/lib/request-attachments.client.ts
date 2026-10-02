"use client";

import { createClient } from "@/lib/supabase/client";
import {
  attachmentBucket,
  requestAttachmentPath,
  resolveAttachmentMimeType,
  type SelectedAttachment,
} from "./request-attachments";

export type AttachmentUploadProgress = {
  completed: number;
  total: number;
  currentFileName: string | null;
};

export async function uploadRequestAttachments(
  requestId: string,
  selections: readonly SelectedAttachment[],
  onProgress?: (progress: AttachmentUploadProgress) => void,
  options?: { preserveExisting?: boolean },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลดเอกสาร" };

  const desiredPaths = selections.map((selection) => requestAttachmentPath(requestId, selection));
  const { data: existingAttachments, error: existingError } = await supabase
    .from("request_attachments")
    .select("storage_path")
    .eq("request_id", requestId);
  if (existingError) {
    return { error: "ไม่สามารถตรวจสอบเอกสารในฉบับร่างได้ กรุณาลองอีกครั้ง" };
  }

  const removedPaths = options?.preserveExisting
    ? []
    : (existingAttachments ?? [])
        .map((attachment) => attachment.storage_path)
        .filter((path) => !desiredPaths.includes(path));
  if (removedPaths.length > 0) {
    const { error: metadataDeleteError } = await supabase
      .from("request_attachments")
      .delete()
      .in("storage_path", removedPaths);
    if (metadataDeleteError) {
      return { error: "ไม่สามารถปรับรายการเอกสารในฉบับร่างได้ กรุณาลองอีกครั้ง" };
    }
    const { error: storageDeleteError } = await supabase.storage
      .from(attachmentBucket)
      .remove(removedPaths);
    if (storageDeleteError) {
      return { error: "ไม่สามารถลบไฟล์เดิมออกจากฉบับร่างได้ กรุณาลองอีกครั้ง" };
    }
  }

  if (selections.length === 0) return { error: null };

  const uploadedPaths: string[] = [];
  try {
    for (const [index, selection] of selections.entries()) {
      onProgress?.({
        completed: index,
        total: selections.length,
        currentFileName: selection.file.name,
      });
      const storagePath = requestAttachmentPath(requestId, selection);
      const mimeType = resolveAttachmentMimeType(selection.file);
      if (!mimeType) throw new Error("unsupported attachment type");

      const { error: uploadError } = await supabase.storage
        .from(attachmentBucket)
        .upload(storagePath, selection.file, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);

      const { error: metadataError } = await supabase.from("request_attachments").upsert(
        {
          request_id: requestId,
          storage_path: storagePath,
          file_name: selection.file.name,
          mime_type: mimeType,
          size_bytes: selection.file.size,
          uploaded_by: user.id,
        },
        { onConflict: "storage_path" },
      );
      if (metadataError) throw metadataError;
    }
  } catch {
    if (uploadedPaths.length > 0) {
      await supabase.from("request_attachments").delete().in("storage_path", uploadedPaths);
      await supabase.storage.from(attachmentBucket).remove(uploadedPaths);
    }
    return {
      error:
        "อัปโหลดเอกสารไม่สำเร็จ คำขอยังถูกเก็บเป็นฉบับร่าง กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
    };
  }

  onProgress?.({ completed: selections.length, total: selections.length, currentFileName: null });
  return { error: null };
}
