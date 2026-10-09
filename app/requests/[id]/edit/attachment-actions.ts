"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { attachmentBucket, maxAttachmentCount } from "@/app/lib/request-attachments";

const removalSchema = z
  .object({
    requestId: z.string().uuid(),
    attachmentIds: z.array(z.string().uuid()).max(maxAttachmentCount),
  })
  .strict();

type RemovalResult = {
  removedIds: string[];
  error: string | null;
  warning: string | null;
};

// Delete only explicitly selected attachments. Use the session client so RLS
// rechecks the owner, uploader and editable status at the actual DELETE.
export async function removeReturnedW119Attachments(
  requestId: string,
  attachmentIds: string[],
): Promise<RemovalResult> {
  const fail = (error: string): RemovalResult => ({ removedIds: [], error, warning: null });
  const parsed = removalSchema.safeParse({ requestId, attachmentIds });
  if (!parsed.success) return fail("รายการเอกสารที่ต้องการลบไม่ถูกต้อง กรุณาเปิดคำขอใหม่");
  const ids = [...new Set(parsed.data.attachmentIds)];
  if (ids.length === 0) return { removedIds: [], error: null, warning: null };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return fail("กรุณาเข้าสู่ระบบใหม่ก่อนลบเอกสาร");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || profile?.active !== true) return fail("บัญชีนี้ไม่มีสิทธิ์ลบเอกสารแนบ");

  const { data: request, error: requestError } = await supabase
    .from("procurement_requests")
    .select("request_no, form_data")
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .eq("status", "returned")
    .maybeSingle();
  const form: unknown = request?.form_data;
  if (
    requestError ||
    !request ||
    !form ||
    typeof form !== "object" ||
    !("formType" in form) ||
    form.formType !== "w119"
  ) {
    return fail("ลบได้เฉพาะเอกสารของคำขอ ว119 ของตนเองที่ถูกส่งกลับแก้ไข");
  }

  const { data: attachments, error: readError } = await supabase
    .from("request_attachments")
    .select("id, storage_path, uploaded_by")
    .eq("request_id", requestId);
  if (readError || !attachments) return fail("ตรวจสอบเอกสารแนบไม่สำเร็จ กรุณาลองใหม่");
  const selected = attachments.filter((attachment) => ids.includes(attachment.id));
  if (selected.some((attachment) => attachment.uploaded_by !== user.id)) {
    return fail("ลบได้เฉพาะเอกสารที่คุณแนบในคำขอนี้");
  }
  if (attachments.length - selected.length < 1) {
    return fail("ต้องมีเอกสารแนบอย่างน้อย 1 ไฟล์ กรุณาแนบไฟล์ทดแทนก่อนลบเอกสารเดิมทั้งหมด");
  }
  const pathPattern = new RegExp(
    `^requests/${requestId}/[0-9a-f-]{36}\\.(pdf|jpg|jpeg|png|docx|xlsx)$`,
    "i",
  );
  if (selected.some((attachment) => !pathPattern.test(attachment.storage_path))) {
    return fail("ตำแหน่งไฟล์ไม่ตรงกับคำขอ กรุณาแจ้งผู้ดูแลระบบตรวจสอบ");
  }

  // Missing IDs are already detached (e.g. a retry after a lost response).
  // They must never be used to construct a storage path or delete another row.
  const removedIds = ids.filter((id) => !attachments.some((attachment) => attachment.id === id));
  if (selected.length === 0) return { removedIds, error: null, warning: null };
  const { data: deleted, error: deleteError } = await supabase
    .from("request_attachments")
    .delete()
    .eq("request_id", requestId)
    .eq("uploaded_by", user.id)
    .in(
      "id",
      selected.map((attachment) => attachment.id),
    )
    .select("id, storage_path");
  if (deleteError || !deleted) return fail("ลบเอกสารไม่สำเร็จ กรุณาตรวจสอบสถานะคำขอแล้วลองใหม่");
  removedIds.push(...deleted.map((attachment) => String(attachment.id)));

  let warning: string | null = null;
  if (deleted.length > 0) {
    // Metadata is removed first so a storage outage cannot leave broken links
    // in the request or its PDF bundle. Report cleanup failures explicitly.
    try {
      const { error: storageError } = await supabase.storage
        .from(attachmentBucket)
        .remove(deleted.map((attachment) => String(attachment.storage_path)));
      if (storageError) throw storageError;
    } catch (error) {
      warning = toSafeActionError(
        "remove-returned-w119-storage",
        {
          cause: error,
          requestId,
          storagePaths: deleted.map((attachment) => attachment.storage_path),
        },
        "นำเอกสารออกจากคำขอแล้ว แต่ลบไฟล์จากพื้นที่จัดเก็บไม่สมบูรณ์ กรุณาแจ้งผู้ดูแลระบบ จากนั้นกดส่งใหม่อีกครั้ง",
      );
    }
    revalidatePath(`/requests/${request.request_no}`);
    revalidatePath(`/requests/${request.request_no}/print`);
  }
  return {
    removedIds,
    warning,
    error:
      deleted.length !== selected.length
        ? "ลบเอกสารได้ไม่ครบ คำขออาจเปลี่ยนสถานะ กรุณาตรวจสอบสถานะก่อนลองใหม่"
        : null,
  };
}
