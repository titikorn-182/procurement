import { z } from "zod";
import { POL01_CHECKLIST_CATEGORIES } from "../pol01-checklist";

export const TOR_HEADINGS = [
  "ความเป็นมา",
  "วัตถุประสงค์",
  "คุณสมบัติของผู้ยื่นข้อเสนอ",
  "รายละเอียดคุณลักษณะเฉพาะของพัสดุหรือขอบเขตของงาน",
  "กำหนดเวลาส่งมอบพัสดุ/สถานที่ดำเนินงาน",
  "หลักเกณฑ์ในการพิจารณาคัดเลือกข้อเสนอ",
  "วงเงินงบประมาณ/วงเงินที่ได้รับจัดสรร",
  "งวดงานและการจ่ายเงิน",
  "อัตราค่าปรับ",
  "การกำหนดระยะเวลารับประกันความชำรุดบกพร่อง (ถ้ามี)",
  "หน่วยงานรับผิดชอบดำเนินการ",
  "ติดต่อสอบถามรายละเอียด",
] as const;

export const TOR_DEFAULTS = [
  "",
  "",
  "1. มีความสามารถตามกฎหมาย\n2. ไม่เป็นบุคคลล้มละลาย\n3. ไม่อยู่ในระหว่างเลิกกิจการ\n4. ไม่เป็นบุคคลซึ่งอยู่ระหว่างถูกระงับการยื่นข้อเสนอหรือทำสัญญากับหน่วยงานของรัฐไว้ชั่วคราวเนื่องจากเป็นผู้ไม่ผ่านเกณฑ์การประเมินผลการปฏิบัติงานของผู้ประกอบการตามระเบียบที่รัฐมนตรีว่าการกระทรวงการคลังกำหนดตามที่ประกาศเผยแพร่ในระบบเครือข่ายสารสนเทศของกรมบัญชีกลาง\n5. ไม่เป็นบุคคลซึ่งถูกระบุชื่อไว้ในบัญชีรายชื่อผู้ทิ้งงานและได้แจ้งเวียนชื่อทิ้งงานของหน่วยงานของรัฐในระบบเครือข่ายสารสนเทศของกรมบัญชีกลาง ซึ่งรวมถึงนิติบุคคลที่ผู้ทิ้งงานเป็นหุ้นส่วนผู้จัดการ กรรมการผู้จัดการ ผู้บริหาร ผู้มีอำนาจในการดำเนินงานในกิจการของนิติบุคคลนั้นด้วย\n6. มีคุณสมบัติและไม่มีลักษณะต้องห้ามตามที่คณะกรรมการนโยบายการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐกำหนดในราชกิจจานุเบกษา\n7. เป็นบุคคลธรรมดาหรือนิติบุคคลผู้มีอาชีพขายหรือผู้รับจ้าง หรือปรากฏได้ว่ามีอาชีพรับจ้างในงานจ้างเหมา\n8. ไม่เป็นผู้ได้รับเอกสิทธิ์หรือความคุ้มกัน ซึ่งอาจปฏิเสธไม่ยอมขึ้นศาลไทย เว้นแต่รัฐบาลของผู้ยื่นข้อเสนอได้มีคำสั่งให้สละเอกสิทธิ์และความคุ้มกันเช่นว่านั้น",
  "",
  "",
  "ใช้เกณฑ์ราคา โดยวิธีเฉพาะเจาะจง",
  "",
  "คณะรัฐศาสตร์จะชำระเงินให้กับผู้รับจ้าง 100% หลังจากที่ผู้ตรวจรับ/คณะกรรมการตรวจรับได้ดำเนินการตรวจรับถูกต้องเรียบร้อยแล้ว และผู้รับจ้างปฏิบัติถูกต้องครบถ้วนตามที่คณะรัฐศาสตร์กำหนด",
  "หากผู้รับจ้างไม่สามารถทำงานให้แล้วเสร็จตามเวลาที่กำหนดไว้ในสัญญา และผู้ว่าจ้างยังมิได้บอกเลิกสัญญา ผู้รับจ้างจะต้องชำระค่าปรับเป็นรายวันในอัตราร้อยละ 0.10 ของค่าจ้างตามสัญญา",
  "ไม่มี",
  "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี\nตำบลเมืองศรีไค อำเภอวารินชำราบ จังหวัดอุบลราชธานี",
  "",
] as const;

export const torSchema = z
  .object({
    version: z.literal(1),
    category: z.enum(POL01_CHECKLIST_CATEGORIES.map((c) => c.id)),
    attachmentId: z.uuid(),
    subject: z.string().max(300),
    project: z.string().max(300),
    sections: z.array(z.string().max(5000)).length(12),
    authors: z
      .array(z.object({ name: z.string().max(200), position: z.string().max(300) }).strict())
      .length(3),
  })
  .strict();
export const torDocumentsSchema = z
  .array(torSchema)
  .max(10)
  .superRefine((docs, ctx) => {
    if (
      new Set(docs.map((d) => d.category)).size !== docs.length ||
      new Set(docs.map((d) => d.attachmentId)).size !== docs.length
    ) {
      ctx.addIssue({ code: "custom", message: "TOR ซ้ำประเภทหรือรหัสเอกสาร" });
    }
  });
export type TorDocument = z.infer<typeof torSchema>;
export function readTorDocuments(value: unknown): TorDocument[] {
  if (value === undefined || value === null) return [];
  const result = torDocumentsSchema.safeParse(value);
  if (!result.success) throw new Error("ข้อมูล TOR ที่บันทึกไว้ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
  return result.data;
}
export function createTor(
  category: TorDocument["category"],
  subject = "",
  background = "",
): TorDocument {
  return {
    version: 1,
    category,
    attachmentId: crypto.randomUUID(),
    subject,
    project: "",
    sections: TOR_DEFAULTS.map((text, i) => (i === 0 ? background : text)),
    authors: Array.from({ length: 3 }, () => ({ name: "", position: "" })),
  };
}
export function torCategoryLabel(category: string) {
  return POL01_CHECKLIST_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
export function validateTorDocuments(docs: TorDocument[], categories: readonly string[]) {
  if (!torDocumentsSchema.safeParse(docs).success)
    return "ข้อมูล TOR ไม่ถูกต้องหรือมีขนาดเกินกำหนด";
  for (const doc of docs) {
    if (!categories.includes(doc.category))
      return `กรุณาเลือกประเภท ${torCategoryLabel(doc.category)} ในเช็คลิสต์ หรือนำ TOR ประเภทนี้ออก`;
    if (
      !doc.subject.trim() ||
      !doc.project.trim() ||
      doc.sections.some((s) => !s.trim()) ||
      !doc.authors[0].name.trim() ||
      !doc.authors[0].position.trim()
    )
      return `กรุณากรอก TOR ${torCategoryLabel(doc.category)} ให้ครบทั้ง 12 หัวข้อ และผู้จัดทำอย่างน้อย 1 คน`;
  }
  return "";
}
