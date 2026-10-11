import { readPol01Checklist } from "@/app/requests/pol01-checklist-schema";
import { normalizePol01ApprovalDetails } from "@/app/requests/pol01";
import { readLoanAgreement } from "@/app/requests/w119/loan-agreement";
import { readExternalPol01 } from "@/app/requests/pol-external/schema";
import { readTorDocuments } from "@/app/requests/tor/model";
import type { ReturnedRequestEditData, ReturnedRequestVendor } from "./edit-types";
import type { Tables } from "@/lib/supabase/database.types";
import { readRecord as editRecord } from "@/lib/data/record";
export type EditableRequestRecord = Pick<
  Tables<"procurement_requests">,
  | "id"
  | "request_no"
  | "requester_id"
  | "kind"
  | "title"
  | "rationale"
  | "required_date"
  | "budget_year"
  | "fund_source"
  | "plan_name"
  | "expense_category"
  | "form_data"
  | "status"
  | "current_step"
> & {
  request_items: Array<
    Pick<
      Tables<"request_items">,
      | "line_no"
      | "description"
      | "quantity"
      | "unit"
      | "unit_price"
      | "market_price"
      | "price_source"
    >
  >;
  request_attachments: Array<
    Pick<Tables<"request_attachments">, "id" | "file_name" | "size_bytes">
  >;
  workflow_actions: Array<Pick<Tables<"workflow_actions">, "action" | "comment" | "created_at">>;
};
export function toRequestEditData(data: EditableRequestRecord): {
  data: ReturnedRequestEditData | null;
  error: string | null;
} {
  const formData = editRecord(data.form_data);
  if (formData.formType !== "standard" && formData.formType !== "w119") {
    return { data: null, error: "แบบคำขอนี้ยังไม่รองรับการแก้ไขจากหน้านี้" };
  }
  const budgetCodes = editRecord(formData.budgetCodes);
  const externalPol01 = readExternalPol01(formData.externalPol01);
  if (formData.externalPol01 != null && !externalPol01) {
    return { data: null, error: "ข้อมูลแบบ POL- ภายนอกไม่ถูกต้อง กรุณาแจ้งผู้ดูแลระบบตรวจสอบ" };
  }
  const vendorRecord = editRecord(formData.vendor);
  const vendor: ReturnedRequestVendor =
    vendorRecord.type === "registered" && typeof vendorRecord.id === "string"
      ? {
          kind: "registered",
          vendorId: vendorRecord.id,
          vendorName:
            typeof vendorRecord.name === "string" ? vendorRecord.name : "ผู้ประกอบการเดิม",
        }
      : vendorRecord.type === "new" && typeof vendorRecord.name === "string"
        ? { kind: "new", vendorName: vendorRecord.name }
        : { kind: "none" };
  const advanceFundingOption =
    formData.advanceFundingOption === "borrow_before_purchase" ||
    formData.advanceFundingOption === "faculty_direct_pay_credit_vendor"
      ? formData.advanceFundingOption
      : "reimburse_after_purchase";
  const sortedItems = [...(data.request_items ?? [])].sort(
    (left, right) => Number(left.line_no) - Number(right.line_no),
  );
  const items = sortedItems.map((item) => ({
    description: String(item.description),
    quantity: Number(item.quantity),
    unit: String(item.unit),
    unitPrice: Number(item.unit_price),
    marketPrice: item.market_price == null ? null : Number(item.market_price),
    priceSource: String(item.price_source ?? ""),
  }));
  const actions = [...(data.workflow_actions ?? [])].sort(
    (left, right) => Date.parse(String(right.created_at)) - Date.parse(String(left.created_at)),
  );
  const latestReturn = actions.find((action) => action.action === "return");

  const common = {
    id: String(data.id),
    status: data.status === "draft" ? ("draft" as const) : ("returned" as const),
    requestNo: String(data.request_no),
    currentStep: Number(data.current_step),
    kind: data.kind === "hire" ? ("hire" as const) : ("purchase" as const),
    title: String(data.title),
    rationale: String(data.rationale),
    requiredDate: String(data.required_date ?? ""),
    budgetYear: Number(data.budget_year),
    fundSource: String(data.fund_source),
    planName: String(data.plan_name ?? ""),
    expenseCategory: String(data.expense_category ?? ""),
    attachments: (data.request_attachments ?? []).map((attachment) => ({
      id: String(attachment.id),
      fileName: String(attachment.file_name),
      sizeBytes: Number(attachment.size_bytes ?? 0),
    })),
    returnReason:
      typeof latestReturn?.comment === "string" && latestReturn.comment.trim()
        ? latestReturn.comment
        : "เจ้าหน้าที่ส่งคำขอกลับเพื่อแก้ไข",
  };

  if (formData.formType === "w119") {
    return {
      data: {
        ...common,
        formType: "w119",
        formData: {
          regulation: String(formData.regulation ?? ""),
          documentNo: String(formData.documentNo ?? ""),
          memoDate: String(formData.memoDate ?? ""),
          departmentName: String(formData.departmentName ?? ""),
          phone: String(formData.phone ?? ""),
          addressee: String(formData.addressee ?? ""),
          selectionCriteria:
            formData.selectionCriteria === "เกณฑ์ราคาประกอบเกณฑ์อื่น"
              ? "เกณฑ์ราคาประกอบเกณฑ์อื่น"
              : "เกณฑ์ราคา",
          advanceRequired: formData.advanceRequired === true,
          loanAgreement: readLoanAgreement(formData.loanAgreement),
          budgetCodes: {
            sourceCode: String(budgetCodes.sourceCode ?? ""),
            departmentCode: String(budgetCodes.departmentCode ?? ""),
            fundCode: String(budgetCodes.fundCode ?? ""),
            planCode: String(budgetCodes.planCode ?? ""),
            subprojectCode: String(budgetCodes.subprojectCode ?? ""),
            activityCode: String(budgetCodes.activityCode ?? ""),
          },
        },
        items,
      },
      error: null,
    };
  }

  return {
    data: {
      ...common,
      formType: "standard",
      ...(externalPol01 ? { externalPol01 } : {}),
      advanceFundingOption,
      vendor,
      sourceCode: String(budgetCodes.sourceCode ?? "2"),
      departmentCode: String(budgetCodes.departmentCode ?? ""),
      fundCode: String(budgetCodes.fundCode ?? ""),
      activityCode: String(budgetCodes.activityCode ?? ""),
      approvalDetails: normalizePol01ApprovalDetails(formData.approvalDetails),
      torDocuments: readTorDocuments(formData.torDocuments),
      removedTorAttachmentIds: Array.isArray(formData.removedTorAttachmentIds)
        ? formData.removedTorAttachmentIds.filter(
            (id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
          )
        : [],
      documentChecklist: readPol01Checklist(formData.documentChecklist, {
        newVendor: vendor.kind === "new",
        borrowing: advanceFundingOption === "borrow_before_purchase",
      }),
      items,
    },
    error: null,
  };
}
