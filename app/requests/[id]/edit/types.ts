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
  departmentCode: string;
  fundCode: string;
  activityCode: string;
  items: ReturnedRequestItem[];
  attachments: ReturnedRequestAttachment[];
  returnReason: string;
};
