"use client";

import { createClient } from "@/lib/supabase/client";
import {
  attachmentBucket,
  paymentAttachmentPath,
  resolveAttachmentMimeType,
  type SelectedAttachment,
} from "./request-attachments";

export type PaymentAttachmentUploadProgress = {
  completed: number;
  total: number;
  currentFileName: string | null;
};

export async function uploadPaymentAttachments(
  paymentId: string,
  selections: readonly SelectedAttachment[],
  onProgress?: (progress: PaymentAttachmentUploadProgress) => void,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลดเอกสาร" };

  const uploadedPaths: string[] = [];
  try {
    for (const [index, selection] of selections.entries()) {
      onProgress?.({
        completed: index,
        total: selections.length,
        currentFileName: selection.file.name,
      });
      const storagePath = paymentAttachmentPath(paymentId, selection);
      const mimeType = resolveAttachmentMimeType(selection.file);
      if (!mimeType) throw new Error("unsupported attachment type");

      const { error: uploadError } = await supabase.storage
        .from(attachmentBucket)
        .upload(storagePath, selection.file, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;
      uploadedPaths.push(storagePath);

      const { error: metadataError } = await supabase.from("payment_attachments").upsert(
        {
          payment_request_id: paymentId,
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
      await supabase.from("payment_attachments").delete().in("storage_path", uploadedPaths);
      await supabase.storage.from(attachmentBucket).remove(uploadedPaths);
    }
    return {
      error:
        "อัปโหลดเอกสารไม่สำเร็จ ระบบเก็บคำขอเป็นฉบับร่างแล้ว กรุณาตรวจสอบอินเทอร์เน็ตและลองส่งอีกครั้ง",
    };
  }

  onProgress?.({ completed: selections.length, total: selections.length, currentFileName: null });
  return { error: null };
}
