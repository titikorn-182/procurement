import { Button } from "@/app/components/ui";
import { emptyW119Item, w119ItemAmount } from "@/app/requests/w119/item-input";
import { Plus, Trash2 } from "lucide-react";
import { inputClass, itemExamples, money } from "./constants";
import type { W119FormController } from "./use-w119-form";
type Props = Pick<
  W119FormController,
  "items" | "updateItem" | "setItems" | "hasAllAmounts" | "total"
>;
export function ItemsStep({ items, updateItem, setItems, hasAllAmounts, total }: Props) {
  return (
    <div className="space-y-4">
      <p id="w119-item-help" className="text-sm text-[var(--line-dark)]">
        ข้อความสีเทาเป็นตัวอย่าง กรุณากรอกข้อมูลจริงทุกช่อง ยอดรวมคำนวณจากจำนวน × ราคาต่อหน่วย
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">รายการ/ขนาด/ลักษณะ</th>
              <th className="w-28 p-3">จำนวน</th>
              <th className="w-24 p-3">หน่วยนับ</th>
              <th className="w-32 p-3">ราคาต่อหน่วย</th>
              <th className="w-32 p-3">ราคากลาง</th>
              <th className="w-44 p-3">แหล่งที่มาของราคา</th>
              <th className="w-32 p-3 text-right">รวม</th>
              <th className="w-14 p-3">
                <span className="sr-only">ลบ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="p-2">
                  <input
                    aria-label={`ชื่อรายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).description}`}
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`จำนวนรายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).quantity}`}
                    value={item.quantity ?? ""}
                    onChange={(event) =>
                      updateItem(index, {
                        quantity: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`หน่วยรายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).unit}`}
                    value={item.unit}
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).unitPrice}`}
                    value={item.unitPrice ?? ""}
                    onChange={(event) =>
                      updateItem(index, {
                        unitPrice: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`ราคากลางรายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).marketPrice}`}
                    value={item.marketPrice ?? ""}
                    onChange={(event) =>
                      updateItem(index, {
                        marketPrice: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`แหล่งที่มาของราคารายการที่ ${index + 1}`}
                    aria-describedby="w119-item-help"
                    className={inputClass}
                    placeholder={`เช่น ${(itemExamples[index] ?? itemExamples[0]).priceSource}`}
                    value={item.priceSource}
                    onChange={(event) => updateItem(index, { priceSource: event.target.value })}
                  />
                </td>
                <td className="p-3 text-right font-semibold text-slate-800">
                  {w119ItemAmount(item) === null ? (
                    <span className="font-normal text-[var(--line-dark)]">คำนวณอัตโนมัติ</span>
                  ) : (
                    money(w119ItemAmount(item)!)
                  )}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    aria-label={`ลบรายการที่ ${index + 1}`}
                    onClick={() =>
                      setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="grid size-10 place-items-center rounded-lg text-[var(--ink)] hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-orange-50">
            <tr>
              <td colSpan={6} className="p-4 text-right font-semibold text-slate-700">
                รวม {items.length} รายการ
              </td>
              <td className="p-4 text-right text-lg font-bold text-orange-700">
                {hasAllAmounts ? (
                  money(total)
                ) : (
                  <span className="text-sm font-normal text-orange-800">รอกรอกข้อมูล</span>
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((current) => [...current, emptyW119Item()])}
        >
          <Plus size={17} /> เพิ่มรายการ
        </Button>
        <p className="text-sm text-slate-500">
          {items.length > 10
            ? "ระบบจะสร้างเอกสารแนบรายการเกิน 10 รายการให้อัตโนมัติ"
            : `เพิ่มได้อีก ${10 - items.length} รายการก่อนแยกเป็นเอกสารแนบ`}
        </p>
      </div>
    </div>
  );
}
