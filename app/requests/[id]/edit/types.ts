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

type ReturnedRequestBase = {
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
  attachments: ReturnedRequestAttachment[];
  returnReason: string;
};

export type ReturnedStandardRequestEditData = ReturnedRequestBase & {
  formType: "standard";
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
};

export type ReturnedW119RequestEditData = ReturnedRequestBase & {
  formType: "w119";
  formData: {
    regulation: string;
    documentNo: string;
    memoDate: string;
    departmentName: string;
    phone: string;
    addressee: string;
    selectionCriteria: "เกณฑ์ราคา" | "เกณฑ์ราคาประกอบเกณฑ์อื่น";
    advanceRequired: boolean;
    budgetCodes: {
      sourceCode: string;
      departmentCode: string;
      fundCode: string;
      planCode: string;
      subprojectCode: string;
      activityCode: string;
    };
  };
  items: (ReturnedRequestItem & { marketPrice: number | null; priceSource: string })[];
};

export type ReturnedRequestEditData = ReturnedStandardRequestEditData | ReturnedW119RequestEditData;
import type { Pol01ApprovalDetails } from "../../pol01";
import type { Pol01Checklist } from "../../pol01-checklist";
