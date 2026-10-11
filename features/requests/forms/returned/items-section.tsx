import { Button } from "@/app/components/ui";
import { emptyPol01Item, pol01ItemAmount } from "@/app/requests/new/item-input";
import { Plus, Trash2 } from "lucide-react";
import { currency, fieldClass } from "./constants";
import { EditSection } from "./frame";
import type { ReturnedRequestFormController } from "./use-returned-request-form";
type Props = Pick<ReturnedRequestFormController, "items" | "updateItem" | "setItems" | "total">;
export function ItemsSection({ items, updateItem, setItems, total }: Props) {
  return (
    <EditSection
      title="รายการพัสดุหรือบริการ"
      description="แก้ไขรายการ จำนวน หน่วย และราคา ระบบจะคำนวณยอดรวมใหม่อัตโนมัติ"
    >
      {/* Contain the absolutely positioned screen-reader header within the scroller. */}
      <div className="relative max-w-full overflow-x-auto border border-[var(--line)]">
        <table className="w-full min-w-[1160px] text-sm">
          <thead className="bg-stone-100 text-left text-stone-700">
            <tr>
              <th className="min-w-64 p-3">รายการ</th>
              <th className="w-28 p-3">จำนวน</th>
              <th className="w-28 p-3">หน่วยนับ</th>
              <th className="w-36 p-3">ราคาต่อหน่วย</th>
              <th className="w-36 p-3">ราคากลาง</th>
              <th className="w-52 p-3">แหล่งที่มาของราคา</th>
              <th className="w-32 p-3 text-right">รวม</th>
              <th className="w-14 p-3">
                <span className="sr-only">ลบ</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="p-2">
                  <input
                    aria-label={`ชื่อรายการที่ ${index + 1}`}
                    className={fieldClass}
                    value={item.description}
                    maxLength={500}
                    placeholder="เช่น กระดาษถ่ายเอกสาร A4 80 แกรม"
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`จำนวนรายการที่ ${index + 1}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={fieldClass}
                    value={item.quantity ?? ""}
                    placeholder="เช่น 10"
                    onChange={(event) =>
                      updateItem(index, {
                        quantity: event.target.value === "" ? null : event.target.valueAsNumber,
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`หน่วยรายการที่ ${index + 1}`}
                    className={fieldClass}
                    value={item.unit}
                    maxLength={100}
                    placeholder="เช่น รีม"
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={fieldClass}
                    value={item.unitPrice ?? ""}
                    placeholder="เช่น 120"
                    onChange={(event) =>
                      updateItem(index, {
                        unitPrice: event.target.value === "" ? null : event.target.valueAsNumber,
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`ราคากลางรายการที่ ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={fieldClass}
                    value={item.marketPrice ?? ""}
                    placeholder="เช่น 120"
                    onChange={(event) =>
                      updateItem(index, {
                        marketPrice: event.target.value === "" ? null : event.target.valueAsNumber,
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`แหล่งที่มาของราคารายการที่ ${index + 1}`}
                    maxLength={500}
                    className={fieldClass}
                    value={item.priceSource}
                    placeholder="เช่น ใบเสนอราคา"
                    onChange={(event) => updateItem(index, { priceSource: event.target.value })}
                  />
                </td>
                <td className="p-3 text-right font-semibold tabular-nums">
                  {pol01ItemAmount(item) == null ? "—" : currency(pol01ItemAmount(item)!)}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="grid size-10 place-items-center text-stone-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-3 focus-visible:outline-[var(--focus)]"
                    aria-label={`ลบรายการที่ ${index + 1}`}
                    onClick={() =>
                      setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-orange-50">
            <tr>
              <td colSpan={6} className="p-4 text-right font-semibold">
                ยอดรวม
              </td>
              <td className="p-4 text-right text-lg font-bold text-orange-700 tabular-nums">
                {currency(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        onClick={() => setItems((current) => [...current, emptyPol01Item()])}
      >
        <Plus size={17} aria-hidden="true" /> เพิ่มรายการ
      </Button>
    </EditSection>
  );
}
