import type { SelectedAttachment } from "@/app/lib/request-attachments";

export type PaymentSourceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type SourceRequest = {
  id: string;
  requestNo: string;
  title: string;
  rationale: string;
  requesterName: string;
  departmentName: string;
  budgetYear: number;
  fundSource: string;
  planName: string;
  expenseCategory: string;
  approvedDate: string;
  approved: number;
  paid: number;
  vendorName: string;
  departmentCode: string;
  fundCode: string;
  activityCode: string;
  items: PaymentSourceItem[];
};

export type PaymentLine = {
  id: string;
  description: string;
  attachmentType: string;
  documentNo: string;
  quantity: string;
  unitPrice: string;
};

export type PaymentDetails = {
  approvalDate: string;
  subject: string;
  projectActivity: string;
  procurementMethod: string;
  egpProjectNo: string;
  contractNo: string;
  contractDate: string;
  vendorName: string;
  vendorTaxId: string;
  contractAmount: string;
  installmentNumber: string;
  installmentCount: string;
  invoiceNo: string;
  invoiceDate: string;
  vat: string;
  delivery: string;
};

export type PaymentFormFiles = readonly SelectedAttachment[];
