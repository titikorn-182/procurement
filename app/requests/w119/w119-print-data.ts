import { formatThaiDocumentDate } from "@/lib/pdf/format";

export type W119PrintItem = {
  lineNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};
export type W119PrintData = {
  requestNo: string;
  documentNo: string;
  memoDate: string;
  department: string;
  phone: string;
  addressee: string;
  title: string;
  rationale: string;
  requiredDate: string;
  requesterName: string;
  requesterPosition: string;
  advanceRequired: boolean;
  items: W119PrintItem[];
  total: number;
  budgetCodes: {
    source: string;
    department: string;
    fund: string;
    plan: string;
    subproject: string;
    activity: string;
  };
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) =>
  typeof value === "string"
    ? value.trim()
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** Saved and unsent W119 data use one renderer. No sample people, signatures or approvals are inferred. */
export function toW119PrintData(data: Record<string, unknown>): W119PrintData {
  const form = record(data.form_data);
  const codes = record(form.budgetCodes);
  const requester = record(data.profiles);
  const items = (Array.isArray(data.request_items) ? data.request_items : [])
    .map((value: unknown) => {
      const item = record(value);
      return {
        lineNo: number(item.line_no),
        description: text(item.description),
        unit: text(item.unit),
        quantity: number(item.quantity),
        unitPrice: number(item.unit_price),
        total:
          item.total_amount == null
            ? number(item.quantity) * number(item.unit_price)
            : number(item.total_amount),
      };
    })
    .sort((a, b) => a.lineNo - b.lineNo);
  return {
    requestNo: text(data.request_no),
    documentNo: text(form.documentNo),
    memoDate: formatThaiDocumentDate(form.memoDate),
    department: text(form.departmentName) || text(record(data.departments).name_th),
    phone: text(form.phone),
    addressee: text(form.addressee),
    title: text(data.title),
    rationale: text(data.rationale),
    requiredDate: formatThaiDocumentDate(data.required_date),
    requesterName: text(requester.full_name),
    requesterPosition: text(requester.position_title),
    advanceRequired: form.advanceRequired === true,
    items,
    total:
      data.estimated_amount == null
        ? items.reduce((sum, item) => sum + item.total, 0)
        : number(data.estimated_amount),
    budgetCodes: {
      source: text(codes.sourceCode),
      department: text(codes.departmentCode),
      fund: text(codes.fundCode),
      plan: text(codes.planCode),
      subproject: text(codes.subprojectCode),
      activity: text(codes.activityCode),
    },
  };
}

export function w119PdfFileName(requestNo: string): string {
  return `W119-${requestNo.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "draft"}.pdf`;
}
