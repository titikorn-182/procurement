import { toPol01PrintData, type Pol01PrintData } from "@/app/requests/[id]/print/pol01-print-data";
import { readExternalPol01, type ExternalPol01 } from "@/app/requests/pol-external/schema";
import {
  externalMetadata,
  externalTotal,
  externalItemTotal,
  type ExternalDraft,
} from "@/app/requests/pol-external/model";
export type ExternalPrintData = { base: Pol01PrintData; metadata: ExternalPol01 };
export function toExternalPrintData(record: Record<string, unknown>): ExternalPrintData | null {
  const form = record.form_data as { externalPol01?: unknown } | null;
  const metadata = readExternalPol01(form?.externalPol01);
  return metadata ? { base: toPol01PrintData(record), metadata } : null;
}
export function externalPreviewData(data: ExternalDraft): ExternalPrintData {
  return {
    metadata: externalMetadata(data),
    base: toPol01PrintData({
      title: data.title,
      rationale: data.rationale,
      required_date: data.requiredDate,
      expense_category: data.expenseCategory,
      estimated_amount: externalTotal(data),
      form_data: { budgetCodes: data.budgetCodes },
      request_items: data.items.map((item, index) => ({
        line_no: index + 1,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: externalItemTotal(item),
      })),
    }),
  };
}
