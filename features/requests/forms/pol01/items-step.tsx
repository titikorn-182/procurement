import { Button } from "@/app/components/ui";
import { CatalogPicker } from "@/app/requests/new/catalog-picker";
import { addCatalogItem } from "@/app/requests/new/catalog-schema";
import { emptyPol01Item, pol01ItemAmount, pol01ItemExamples } from "@/app/requests/new/item-input";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { inputClass, money } from "./constants";
import type { Pol01FormController } from "./use-pol01-form";
type Props = Pick<
  Pol01FormController,
  "items" | "updateItem" | "setItems" | "total" | "catalogToggle" | "catalogOpen" | "setCatalogOpen"
>;
export function ItemsStep({
  items,
  updateItem,
  setItems,
  total,
  catalogToggle,
  catalogOpen,
  setCatalogOpen,
}: Props) {
  return (
    <div className="space-y-4">
      <p id="pol01-items-hint" className="text-sm leading-6 text-stone-600">
        ข้อความสีเทาเป็นตัวอย่างการกรอก กรุณากรอกข้อมูลจริงและลบแถวที่ไม่ใช้
        ราคากลางเป็นราคาต่อหน่วยสำหรับอ้างอิง ยอดรวมคำนวณจากจำนวน × ราคาต่อหน่วย
      </p>
      {/* Contain the absolutely positioned screen-reader header within the scroller. */}
      <div className="relative overflow-x-auto rounded-xl border border-slate-200">
        <table
          aria-describedby="pol01-items-hint"
          className="w-full min-w-[1160px] text-sm [&_input]:text-base [&_input]:placeholder:font-normal [&_input]:placeholder:text-stone-500 sm:[&_input]:text-sm"
        >
          <thead className="bg-slate-50 text-left text-slate-600">
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
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="p-2">
                  <input
                    aria-label={`ชื่อรายการที่ ${index + 1}`}
                    className={inputClass}
                    value={item.description}
                    maxLength={500}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).description}`}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`จำนวนรายการที่ ${index + 1}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputClass}
                    value={item.quantity ?? ""}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).quantity}`}
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
                    className={inputClass}
                    value={item.unit}
                    maxLength={100}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).unit}`}
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={item.unitPrice ?? ""}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).price}`}
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
                    className={inputClass}
                    value={item.marketPrice ?? ""}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).price}`}
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
                    className={inputClass}
                    maxLength={500}
                    value={item.priceSource}
                    placeholder={`เช่น ${(pol01ItemExamples[index] ?? pol01ItemExamples[0]).source}`}
                    onChange={(event) => updateItem(index, { priceSource: event.target.value })}
                  />
                </td>
                <td className="p-3 text-right font-semibold text-slate-800">
                  {pol01ItemAmount(item) == null ? (
                    <span className="font-normal text-stone-500">—</span>
                  ) : (
                    money(pol01ItemAmount(item)!)
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
                ยอดรวมทั้งสิ้น
              </td>
              <td className="p-4 text-right text-lg font-bold text-orange-700">{money(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setItems((current) => [...current, emptyPol01Item()])}
        >
          <Plus size={17} /> เพิ่มรายการ
        </Button>
        <button
          type="button"
          ref={catalogToggle}
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] hover:bg-[var(--paper-warm)]"
          aria-expanded={catalogOpen}
          aria-controls="reference-price-catalog"
          onClick={() => setCatalogOpen((current) => !current)}
        >
          <BookOpen size={17} /> แค็ตตาล็อกราคากลาง
        </button>
      </div>
      {catalogOpen && (
        <CatalogPicker
          onClose={() => {
            setCatalogOpen(false);
            catalogToggle.current?.focus();
          }}
          onSelect={(entry) => {
            const next = addCatalogItem(items, entry);
            if (!next) return false;
            setItems(next);
            return true;
          }}
        />
      )}
    </div>
  );
}
