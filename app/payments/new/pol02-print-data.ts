import { formatThaiDocumentDate } from "@/lib/pdf/format";
import { pol02DocumentChecklist } from "./pol02";
import type { PaymentDetails, PaymentLine, SourceRequest } from "./types";

export type Pol02PrintItem = {
  lineNo: number;
  description: string;
  attachmentType: string;
  documentNo: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Pol02PrintData = {
  source: Pick<
    SourceRequest,
    | "requestNo"
    | "departmentName"
    | "requesterName"
    | "budgetYear"
    | "fundSource"
    | "planName"
    | "expenseCategory"
    | "departmentCode"
    | "fundCode"
    | "activityCode"
    | "approved"
    | "paid"
  >;
  details: PaymentDetails;
  documentDate: string;
  items: Pol02PrintItem[];
  subtotal: number;
  vat: number;
  total: number;
  contractAmount: number;
  documents: string[];
  attachments: string[];
};

function finiteNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function createPol02PrintData({
  request,
  details,
  lines,
  selectedDocuments,
  attachmentNames,
  date = new Date(),
}: {
  request: SourceRequest;
  details: PaymentDetails;
  lines: PaymentLine[];
  selectedDocuments: string[];
  attachmentNames: string[];
  date?: Date;
}): Pol02PrintData {
  const source: Pol02PrintData["source"] = {
    requestNo: request.requestNo,
    departmentName: request.departmentName,
    requesterName: request.requesterName,
    budgetYear: request.budgetYear,
    fundSource: request.fundSource,
    planName: request.planName,
    expenseCategory: request.expenseCategory,
    departmentCode: request.departmentCode,
    fundCode: request.fundCode,
    activityCode: request.activityCode,
    approved: request.approved,
    paid: request.paid,
  };
  const items = lines.map((line, index) => {
    const quantity = finiteNumber(line.quantity);
    const unitPrice = finiteNumber(line.unitPrice);
    return {
      lineNo: index + 1,
      description: line.description.trim(),
      attachmentType: line.attachmentType,
      documentNo: line.documentNo.trim(),
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vat = finiteNumber(details.vat);
  return {
    source,
    details: { ...details },
    documentDate: formatThaiDocumentDate(date.toISOString()),
    items,
    subtotal: roundMoney(subtotal),
    vat: roundMoney(vat),
    total: roundMoney(subtotal + vat),
    contractAmount: finiteNumber(details.contractAmount),
    documents: pol02DocumentChecklist
      .filter((item) => selectedDocuments.includes(item.id))
      .map((item) => item.label),
    attachments: attachmentNames.map((name) => name.trim()).filter(Boolean),
  };
}

export function pol02DraftFileName(sourceRequestNo: string): string {
  const reference = sourceRequestNo.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return `POL02-draft-${reference || "document"}.pdf`;
}
