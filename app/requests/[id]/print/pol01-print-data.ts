import { normalizePol01ApprovalDetails, type Pol01ApprovalDetails } from "../../pol01";

export type Pol01PrintItem = {
  lineNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Pol01PrintData = {
  requestNo: string;
  title: string;
  rationale: string;
  department: string;
  phone: string;
  documentNo: string;
  addressee: string;
  createdDate: string;
  requiredDate: string;
  expenseCategory: string;
  budgetYear: string;
  fundSource: string;
  planName: string;
  vendor: string;
  budgetCodes: { source: string; department: string; fund: string; activity: string };
  items: Pol01PrintItem[];
  total: number;
  approval: Pol01ApprovalDetails;
  attachments: string[];
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function printDate(value: unknown): string {
  const date = new Date(text(value));
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(
        date,
      );
}

export function toPol01PrintData(data: Record<string, unknown>): Pol01PrintData {
  const form = record(data.form_data);
  const codes = record(form.budgetCodes);
  return {
    requestNo: text(data.request_no),
    title: text(data.title),
    rationale: text(data.rationale),
    department: text(record(data.departments).name_th),
    phone: text(form.phone),
    documentNo: text(form.documentNo),
    addressee: text(form.addressee) || "คณบดีคณะรัฐศาสตร์",
    createdDate: printDate(data.created_at),
    requiredDate: printDate(data.required_date),
    expenseCategory: text(data.expense_category),
    budgetYear: text(data.budget_year),
    fundSource: text(data.fund_source),
    planName: text(data.plan_name),
    vendor: text(record(form.vendor).name),
    budgetCodes: {
      source: text(codes.sourceCode),
      department: text(codes.departmentCode),
      fund: text(codes.fundCode),
      activity: text(codes.activityCode),
    },
    items: (Array.isArray(data.request_items) ? data.request_items : [])
      .map((value: unknown) => {
        const item = record(value);
        return {
          lineNo: number(item.line_no),
          description: text(item.description),
          unit: text(item.unit),
          quantity: number(item.quantity),
          unitPrice: number(item.unit_price),
          total: number(item.total_amount),
        };
      })
      .sort((a, b) => a.lineNo - b.lineNo),
    total: number(data.estimated_amount),
    approval: normalizePol01ApprovalDetails(form.approvalDetails),
    attachments: (Array.isArray(data.request_attachments) ? data.request_attachments : [])
      .map((value: unknown) => text(record(value).file_name))
      .filter(Boolean),
  };
}
