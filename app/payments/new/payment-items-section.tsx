import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { Button, inputClass } from "../../components/ui";
import { attachmentTypeOptions, paymentLineAmount, toThaiBahtText } from "./pol02";
import type { PaymentLine } from "./types";

type Props = {
  lines: PaymentLine[];
  vat: string;
  disabled: boolean;
  onLinesChange: (lines: PaymentLine[]) => void;
  onVatChange: (vat: string) => void;
};

function money(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentItemsSection({ lines, vat, disabled, onLinesChange, onVatChange }: Props) {
  const subtotal = lines.reduce((sum, line) => sum + paymentLineAmount(line), 0);
  const total = subtotal + (Number(vat) || 0);

  function updateLine(id: string, changes: Partial<PaymentLine>) {
    onLinesChange(lines.map((line) => (line.id === id ? { ...line, ...changes } : line)));
  }

  function addLine() {
    onLinesChange([
      ...lines,
      {
        id: crypto.randomUUID(),
        description: "",
        attachmentType: attachmentTypeOptions[0],
        documentNo: "",
        quantity: "1",
        unitPrice: "",
      },
    ]);
  }

  return (
    <section aria-labelledby="payment-items-heading" className="border-b border-[var(--line)]">
      <div className="flex items-start gap-3 bg-[var(--paper-warm)] px-5 py-4">
        <ReceiptText className="mt-0.5 text-[var(--orange)]" size={22} aria-hidden="true" />
        <div>
          <h2 id="payment-items-heading" className="text-lg font-bold">
            4. รายละเอียดจำนวนเงินที่ขอเบิก
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            รายการและยอดรวมต้องตรงกับใบแจ้งหนี้หรือหลักฐานการจ่ายที่แนบ
          </p>
        </div>
      </div>
      <div className="min-w-0 p-5">
        <div className="max-w-full overflow-x-auto border border-[var(--line)]">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead className="bg-stone-100 text-left text-xs font-bold text-stone-700">
              <tr>
                <th className="w-14 border-b border-r border-[var(--line)] p-3 text-center">
                  ลำดับ
                </th>
                <th className="min-w-64 border-b border-r border-[var(--line)] p-3">รายการ</th>
                <th className="w-48 border-b border-r border-[var(--line)] p-3">
                  ประเภทเอกสารแนบเบิก
                </th>
                <th className="w-36 border-b border-r border-[var(--line)] p-3">เลขที่เอกสาร</th>
                <th className="w-24 border-b border-r border-[var(--line)] p-3">จำนวน</th>
                <th className="w-36 border-b border-r border-[var(--line)] p-3">หน่วยละ</th>
                <th className="w-36 border-b border-r border-[var(--line)] p-3 text-right">
                  จำนวนเงิน
                </th>
                <th className="w-14 border-b border-[var(--line)] p-3">
                  <span className="sr-only">ลบ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id} className="align-top">
                  <td className="border-b border-r border-[var(--line)] p-3 text-center font-semibold">
                    {index + 1}
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-2">
                    <input
                      required
                      aria-label={`รายการที่ ${index + 1}`}
                      maxLength={500}
                      value={line.description}
                      disabled={disabled}
                      onChange={(event) => updateLine(line.id, { description: event.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-2">
                    <select
                      required
                      aria-label={`ประเภทเอกสารรายการที่ ${index + 1}`}
                      value={line.attachmentType}
                      disabled={disabled}
                      onChange={(event) =>
                        updateLine(line.id, { attachmentType: event.target.value })
                      }
                      className={inputClass}
                    >
                      {attachmentTypeOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-2">
                    <input
                      aria-label={`เลขที่เอกสารรายการที่ ${index + 1}`}
                      maxLength={100}
                      value={line.documentNo}
                      disabled={disabled}
                      onChange={(event) => updateLine(line.id, { documentNo: event.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-2">
                    <input
                      required
                      aria-label={`จำนวนรายการที่ ${index + 1}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      disabled={disabled}
                      onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-2">
                    <input
                      required
                      aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      disabled={disabled}
                      onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="border-b border-r border-[var(--line)] p-3 text-right font-bold tabular-nums">
                    {money(paymentLineAmount(line))}
                  </td>
                  <td className="border-b border-[var(--line)] p-2 text-center">
                    <button
                      type="button"
                      aria-label={`ลบรายการที่ ${index + 1}`}
                      disabled={disabled || lines.length === 1}
                      onClick={() => onLinesChange(lines.filter((item) => item.id !== line.id))}
                      className="inline-flex size-10 items-center justify-center border border-transparent text-stone-500 hover:border-[var(--red)] hover:bg-[var(--red-soft)] hover:text-[var(--red)] disabled:opacity-35"
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          disabled={disabled || lines.length >= 100}
          onClick={addLine}
        >
          <Plus size={17} aria-hidden="true" /> เพิ่มรายการ
        </Button>

        <div className="mt-5 ml-auto max-w-lg border border-[var(--line-dark)] bg-white">
          <div className="grid grid-cols-[1fr_180px] items-center border-b border-[var(--line)] px-4 py-3">
            <span>มูลค่าก่อนภาษี</span>
            <strong className="text-right tabular-nums">{money(subtotal)} บาท</strong>
          </div>
          <label className="grid grid-cols-[1fr_180px] items-center border-b border-[var(--line)] px-4 py-3">
            <span className="font-semibold">ภาษีมูลค่าเพิ่ม</span>
            <input
              aria-label="ภาษีมูลค่าเพิ่ม"
              type="number"
              min="0"
              step="0.01"
              value={vat}
              disabled={disabled}
              onChange={(event) => onVatChange(event.target.value)}
              className={`${inputClass} text-right tabular-nums`}
            />
          </label>
          <div className="grid grid-cols-[1fr_180px] items-center bg-[var(--orange-soft)] px-4 py-4">
            <strong>ยอดรวมขอเบิก</strong>
            <strong className="text-right text-xl text-[var(--orange-dark)] tabular-nums">
              {money(total)} บาท
            </strong>
          </div>
          <p className="border-t border-[var(--line)] px-4 py-3 text-sm text-stone-600">
            จำนวนเงินตัวอักษร:{" "}
            <strong className="text-[var(--ink)]">{toThaiBahtText(total)}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
