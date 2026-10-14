import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { MAX_DRAFT_BYTES, totals, w804DraftSchema } from "@/app/requests/w804/model";
import { W804_LIMIT } from "@/app/requests/w804/config";
import type { W804SaveResult } from "../types";

const saveInput = z.object({
  id: z.uuid(),
  revision: z.number().int().min(0).max(2147483646),
  data: w804DraftSchema,
});

export async function saveW804Draft(input: unknown): Promise<W804SaveResult> {
  const parsed = saveInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "ข้อมูลแบบร่างไม่ถูกต้อง กรุณาตรวจวันที่ ตัวเลข และความยาวข้อความ" };
  const { id, revision, data } = parsed.data;
  if (!data.title.trim())
    return { ok: false, error: "กรุณาระบุเรื่อง/ชื่อรายการจัดซื้อก่อนบันทึกทะเบียน" };
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > MAX_DRAFT_BYTES)
    return { ok: false, error: "ข้อมูลแบบร่างเกิน 250 KB กรุณาลดข้อความหรือจำนวนรายการ" };
  if (totals(data).requested > W804_LIMIT)
    return { ok: false, error: "วงเงินขอซื้อ ว804 ต้องไม่เกิน 50,000 บาท" };
  try {
    const client = await createClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก" };
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("role,active")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.active || !["user", "admin"].includes(profile.role))
      return { ok: false, error: "บัญชีนี้ไม่มีสิทธิ์จัดทำคำขอ ว804" };
    // The database repeats authorization, issues the number, and checks the revision atomically.
    const { data: saved, error } = await client.rpc("save_w804_document_set", {
      record_id: id,
      expected_revision: revision,
      draft_data: data,
    });
    if (error?.code === "40001")
      return {
        ok: false,
        error:
          "คำขอนี้มีการแก้ไขจากอีกหน้าต่างแล้ว กรุณาดาวน์โหลดแบบร่างเก็บไว้ แล้วเปิดคำขอจากทะเบียนใหม่ก่อนแก้ไขต่อ",
      };
    if (error?.code === "42501")
      return { ok: false, error: "คุณไม่มีสิทธิ์แก้ไขคำขอนี้ กรุณาตรวจสอบบัญชีที่เข้าสู่ระบบ" };
    if (error) throw error;
    const row = saved?.[0];
    if (!row || !/^W804-\d{3,}$/.test(row.request_no))
      throw new Error("Missing W804 save identity");
    return { ok: true, record: { id: row.id, requestNo: row.request_no, revision: row.revision } };
  } catch (error) {
    return {
      ok: false,
      error: toSafeActionError(
        "save-w804",
        error,
        "บันทึกทะเบียนไม่สำเร็จ ข้อมูลในหน้านี้ยังอยู่ กรุณาลองบันทึกอีกครั้ง",
      ),
    };
  }
}
