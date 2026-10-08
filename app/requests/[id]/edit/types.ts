export type ReturnedRequestItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type ReturnedRequestAttachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
};

export type ReturnedRequestVendor =
  | { kind: "none" }
  | { kind: "registered"; vendorId: string; vendorName: string }
  | { kind: "new"; vendorName: string };

export type ReturnedRequestEditData = {
  id: string;
  requestNo: string;
  currentStep: number;
  kind: "purchase" | "hire";
  title: string;
  rationale: string;
  requiredDate: string;
  budgetYear: number;
  fundSource: string;
  planName: string;
  expenseCategory: string;
  advanceFundingOption:
    "borrow_before_purchase" | "reimburse_after_purchase" | "faculty_direct_pay_credit_vendor";
  vendor: ReturnedRequestVendor;
  sourceCode: string;
  departmentCode: string;
  fundCode: string;
  activityCode: string;
  approvalDetails: Pol01ApprovalDetails;
  documentChecklist: Pol01Checklist;
  items: ReturnedRequestItem[];
  attachments: ReturnedRequestAttachment[];
  returnReason: string;
};
import type { Pol01ApprovalDetails } from "../../pol01";
import type { Pol01Checklist } from "../../pol01-checklist";
