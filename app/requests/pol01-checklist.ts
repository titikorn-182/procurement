/** POL-01 column of the faculty's document checklist. This is a requester self-check,
 * not an approval or a new submission gate. Loan agreements remain optional. */
export type ChecklistItem = {
  id: string;
  label: string;
  optional?: boolean;
};

const materials: ChecklistItem = { id: "items", label: "รายการวัสดุพร้อมจำนวน" };
const specification: ChecklistItem = { id: "specification", label: "รายละเอียดคุณลักษณะเฉพาะ" };
const quotation: ChecklistItem = { id: "quotation", label: "ใบเสนอราคา", optional: true };
const marketPrice: ChecklistItem = {
  id: "market_price",
  label: "เอกสารราคากลาง/สืบราคาตลาด",
  optional: true,
};
const photos: ChecklistItem = { id: "photos", label: "รูปภาพประกอบ", optional: true };
const generalMaterials = [materials, specification, quotation, marketPrice, photos];
const hiring = [
  { id: "details", label: "รายละเอียดการจ้าง" },
  { id: "tor", label: "ขอบเขตรายละเอียด (TOR) ตามรูปแบบที่คณะกำหนด", optional: true },
  quotation,
];

export const POL01_CHECKLIST_CATEGORIES = [
  { id: "office", label: "ซื้อวัสดุสำนักงาน", items: generalMaterials },
  { id: "scientific", label: "ซื้อวัสดุวิทยาศาสตร์และการแพทย์", items: generalMaterials },
  { id: "household", label: "ซื้อวัสดุงานบ้านงานครัว", items: generalMaterials },
  {
    id: "electrical",
    label: "ซื้อวัสดุไฟฟ้าและวิทยุ",
    items: [
      materials,
      specification,
      { id: "standard", label: "เอกสารมาตรฐานผลิตภัณฑ์ (มอก.)", optional: true },
      marketPrice,
      quotation,
      photos,
    ],
  },
  {
    id: "fuel",
    label: "ซื้อวัสดุเชื้อเพลิงและหล่อลื่น",
    items: [materials, { id: "usage", label: "รายละเอียดการใช้งาน" }],
  },
  { id: "sports", label: "ซื้อวัสดุกีฬา", items: generalMaterials },
  { id: "construction", label: "ซื้อวัสดุก่อสร้าง", items: generalMaterials },
  {
    id: "computer",
    label: "ซื้อวัสดุคอมพิวเตอร์",
    items: [
      materials,
      { id: "ict", label: "คุณลักษณะเฉพาะตามเกณฑ์ ICT" },
      marketPrice,
      quotation,
      photos,
    ],
  },
  {
    id: "rental",
    label: "เช่าทั่วไป",
    items: [
      { id: "details", label: "รายละเอียดการเช่า เช่น จำนวนวัน จำนวนชุด รายละเอียดเครื่องดนตรี" },
      { ...photos, label: "รูปภาพประกอบ เช่น ภาพเวที ภาพห้องประชุม" },
      quotation,
    ],
  },
  {
    id: "vehicle_rental",
    label: "เช่ารถ",
    items: [
      { id: "details", label: "รายละเอียดการเช่ารถ" },
      { id: "photos", label: "รูปภาพรถที่ต้องการเช่าทุกคัน พร้อมป้ายทะเบียนตรงกับทะเบียนรถ" },
      {
        id: "registration",
        label: "ทะเบียนรถทุกคัน (หน้ารายการจดทะเบียน เจ้าของรถ และรายการเสียภาษี)",
      },
      {
        id: "transport_license",
        label:
          "ใบอนุญาตประกอบการขนส่งไม่ประจำทางด้วยรถที่ใช้ในการขนส่งผู้โดยสาร (กรณีรถตู้หรือรถบัสปรับอากาศ)",
        optional: true,
      },
      { id: "driver_license", label: "ใบอนุญาตขับขี่ของพนักงานขับรถทุกคัน" },
      quotation,
    ],
  },
  {
    id: "custom_goods",
    label: "จ้างทำของ",
    items: [
      { id: "details", label: "รายละเอียดการจ้างทำของ เช่น กระเป๋า ร่ม ป้ายไวนิล" },
      { id: "tor", label: "ขอบเขตรายละเอียด (TOR) ตามรูปแบบที่คณะกำหนด" },
      { ...photos, label: "รูปภาพตัวอย่างประกอบ" },
      quotation,
    ],
  },
  {
    id: "maintenance",
    label: "ซ่อมบำรุง",
    items: [
      { id: "damage", label: "รายงานความเสียหาย", optional: true },
      { id: "details", label: "รายละเอียดการซ่อมบำรุง" },
      { ...photos, label: "รูปถ่ายก่อนซ่อม" },
      quotation,
    ],
  },
  { id: "individual_hire", label: "จ้างเหมาบุคคล", items: hiring },
  { id: "service", label: "จ้างเหมาบริการ", items: hiring },
  {
    id: "equipment",
    label: "ซื้อครุภัณฑ์ทุกประเภท",
    items: [
      { id: "specification", label: "ขอบเขตคุณลักษณะเฉพาะตามรูปแบบที่คณะกำหนด" },
      { id: "items", label: "รายการครุภัณฑ์พร้อมจำนวน" },
      { ...marketPrice, optional: false },
      { ...quotation, optional: false },
      { id: "comparison_quote", label: "ใบเสนอราคาของคู่เทียบอย่างน้อย 1 ราย" },
    ],
  },
] as const satisfies ReadonlyArray<{ id: string; label: string; items: readonly ChecklistItem[] }>;

export type Pol01ChecklistCategory = (typeof POL01_CHECKLIST_CATEGORIES)[number]["id"];
export type Pol01ChecklistStatus = "checked" | "not_applicable";
export type Pol01Checklist = {
  version: 1;
  categories: Pol01ChecklistCategory[];
  entries: Record<string, Pol01ChecklistStatus>;
};
export type Pol01ChecklistContext = { newVendor: boolean; borrowing: boolean };
export type Pol01ChecklistGroup = { id: string; label: string; items: ChecklistItem[] };

export function createPol01Checklist(): Pol01Checklist {
  return { version: 1, categories: [], entries: {} };
}

export function getPol01ChecklistGroups(
  categories: readonly Pol01ChecklistCategory[],
  context: Pol01ChecklistContext,
): Pol01ChecklistGroup[] {
  const basic: ChecklistItem[] = [
    { id: "approved_project", label: "โครงการที่ได้รับอนุมัติแล้ว (ถ้ามี)", optional: true },
    {
      id: "budget_change",
      label: "บันทึกข้อความที่ได้รับอนุมัติเปลี่ยนแปลงงบประมาณ (ถ้ามี)",
      optional: true,
    },
  ];
  if (context.newVendor) {
    basic.push(
      {
        id: "vendor_documents",
        label:
          "เอกสารผู้ประกอบการรายใหม่ เช่น หนังสือรับรองบริษัท หรือบัตรประจำตัวประชาชน เพื่อเพิ่มฐานข้อมูลในระบบ UBUFMIS",
      },
      { id: "vendor_phone", label: "เบอร์โทรศัพท์ผู้ประกอบการรายใหม่ (ถ้ามี)", optional: true },
    );
  }
  if (context.borrowing) {
    basic.push({
      id: "loan_agreement",
      label: "สัญญายืมเงิน (แนบได้ถ้ามี ไม่บังคับ)",
      optional: true,
    });
  }
  return [
    { id: "basic", label: "เอกสารพื้นฐาน", items: basic },
    ...POL01_CHECKLIST_CATEGORIES.filter((category) => categories.includes(category.id)).map(
      (category) => ({ id: category.id, label: category.label, items: [...category.items] }),
    ),
  ];
}

export function checklistEntryKey(groupId: string, itemId: string) {
  return `${groupId}.${itemId}`;
}

/** Drop hidden answers so changing vendor, funding, or category cannot preserve stale checks. */
export function reconcilePol01Checklist(
  value: Pol01Checklist,
  context: Pol01ChecklistContext,
): Pol01Checklist {
  const categories = POL01_CHECKLIST_CATEGORIES.filter((category) =>
    value.categories.includes(category.id),
  ).map((category) => category.id);
  const entries: Pol01Checklist["entries"] = {};
  for (const group of getPol01ChecklistGroups(categories, context)) {
    for (const item of group.items) {
      const key = checklistEntryKey(group.id, item.id);
      const status = value.entries[key];
      if (status === "checked" || (status === "not_applicable" && item.optional)) {
        entries[key] = status;
      }
    }
  }
  return { version: 1, categories, entries };
}

export function summarizePol01Checklist(value: Pol01Checklist, context: Pol01ChecklistContext) {
  const normalized = reconcilePol01Checklist(value, context);
  const total = getPol01ChecklistGroups(normalized.categories, context).reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const statuses = Object.values(normalized.entries);
  return {
    total,
    checked: statuses.filter((status) => status === "checked").length,
    notApplicable: statuses.filter((status) => status === "not_applicable").length,
    pending: total - statuses.length,
  };
}
