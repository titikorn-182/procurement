import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui";
import { VendorPicker } from "../new/vendor-picker";
import {
  blankExternalItem,
  externalItemTotal,
  externalTotal,
  fundingOptions,
  type ExternalDraft,
} from "./model";
import { externalMethodLabels } from "./schema";
import { formatDocumentMoney as money } from "@/lib/pdf/format";

export const externalInputClass =
  "mt-2 min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--line-dark)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";
export function ExternalField({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  type = "text",
  placeholder,
  maxLength = 300,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const props = {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    className: externalInputClass,
    required,
    maxLength,
    placeholder,
  };
  return (
    <label className="block min-w-0 text-sm font-semibold">
      {label}
      {required && <span aria-hidden="true"> *</span>}
      {multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} />}
    </label>
  );
}

type Props = { data: ExternalDraft; update: (data: ExternalDraft) => void };
export function ExternalGeneralFields({ data, update }: Props) {
  const meta = (key: keyof ExternalDraft["metadata"], value: string) =>
    update({ ...data, metadata: { ...data.metadata, [key]: value } });
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ExternalField
        label="ส่วนราชการ"
        required
        value={data.metadata.departmentName}
        onChange={(value) => meta("departmentName", value)}
      />
      <ExternalField
        label="โทรศัพท์"
        required
        maxLength={50}
        value={data.metadata.phone}
        onChange={(value) => meta("phone", value)}
      />
      <ExternalField
        label="เลขที่หนังสือ"
        maxLength={100}
        value={data.metadata.documentNo}
        onChange={(value) => meta("documentNo", value)}
      />
      <ExternalField
        label="วันที่หนังสือ"
        required
        type="date"
        value={data.metadata.memoDate}
        onChange={(value) => meta("memoDate", value)}
      />
      <label className="block text-sm font-semibold">
        ประเภทคำขอ
        <select
          className={externalInputClass}
          value={data.metadata.method}
          onChange={(event) => meta("method", event.target.value)}
        >
          {Object.entries(externalMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <ExternalField
        label="เรียน"
        required
        value={data.metadata.addressee}
        onChange={(value) => meta("addressee", value)}
      />
      <div className="md:col-span-2">
        <ExternalField
          label="เรื่อง"
          required
          value={data.title}
          placeholder="ระบุเรื่องที่ขอซื้อ / เช่า / จ้าง"
          onChange={(title) => update({ ...data, title })}
        />
      </div>
      <ExternalField
        label="งาน/สาขาที่ขอ"
        required
        value={data.metadata.workUnit}
        onChange={(value) => meta("workUnit", value)}
      />
      <ExternalField
        label="หน่วยงานพัสดุที่ดำเนินการ"
        required
        value={data.metadata.procurementUnit}
        onChange={(value) => meta("procurementUnit", value)}
      />
      <div className="md:col-span-2">
        <ExternalField
          label="วัตถุประสงค์ / เพื่อใช้"
          required
          multiline
          maxLength={5000}
          value={data.rationale}
          placeholder="ระบุโครงการบริการวิชาการและเหตุผลความจำเป็น"
          onChange={(rationale) => update({ ...data, rationale })}
        />
      </div>
      <label className="block text-sm font-semibold">
        หมวดรายจ่าย
        <select
          className={externalInputClass}
          value={data.expenseCategory}
          onChange={(event) =>
            update({
              ...data,
              expenseCategory: event.target.value as ExternalDraft["expenseCategory"],
            })
          }
        >
          <option>ค่าใช้สอย</option>
          <option>ค่าวัสดุ</option>
        </select>
      </label>
      <ExternalField
        label="วันที่ต้องการรับพัสดุ"
        required
        type="date"
        value={data.requiredDate}
        onChange={(requiredDate) => update({ ...data, requiredDate })}
      />
    </div>
  );
}
export function ExternalItemFields({ data, update }: Props) {
  const change = (index: number, patch: Partial<ExternalDraft["items"][number]>) =>
    update({
      ...data,
      items: data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  return (
    <>
      <p className="mb-4 text-sm text-[var(--line-dark)]">
        ข้อความสีเทาเป็นตัวอย่าง กรุณากรอกข้อมูลจริง ราคาต่อหน่วยให้รวมค่าใช้จ่ายทั้งหมดแล้ว
      </p>
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="ตารางรายการพัสดุ เลื่อนแนวนอนเพื่อดูทุกช่อง"
      >
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="sr-only">รายการพัสดุสำหรับ POL- ภายนอก</caption>
          <thead className="bg-[var(--paper-warm)]">
            <tr>
              {[
                "รายการ/ขนาด/ลักษณะ",
                "หน่วยนับ",
                "จำนวน",
                "ราคา/หน่วย",
                "รวม",
                "หมายเหตุ",
                "ลบ",
              ].map((label) => (
                <th key={label} scope="col" className="border border-[var(--line)] p-3 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="w-72 border border-[var(--line)] p-2">
                  <textarea
                    aria-label={`รายการ ${index + 1}`}
                    maxLength={500}
                    rows={2}
                    className={externalInputClass}
                    placeholder="เช่น จ้างเหมาบริการจัดกิจกรรม"
                    value={item.description}
                    onChange={(event) => change(index, { description: event.target.value })}
                  />
                </td>
                <td className="w-24 border border-[var(--line)] p-2">
                  <input
                    aria-label={`หน่วยนับ ${index + 1}`}
                    maxLength={100}
                    className={externalInputClass}
                    placeholder="เช่น งาน"
                    value={item.unit}
                    onChange={(event) => change(index, { unit: event.target.value })}
                  />
                </td>
                <td className="w-28 border border-[var(--line)] p-2">
                  <input
                    aria-label={`จำนวน ${index + 1}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={externalInputClass}
                    placeholder="เช่น 1"
                    value={item.quantity ?? ""}
                    onChange={(event) =>
                      change(index, {
                        quantity: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td className="w-36 border border-[var(--line)] p-2">
                  <input
                    aria-label={`ราคาต่อหน่วย ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    className={externalInputClass}
                    placeholder="เช่น 1500"
                    value={item.unitPrice ?? ""}
                    onChange={(event) =>
                      change(index, {
                        unitPrice: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                  />
                </td>
                <td className="border border-[var(--line)] p-3 text-right tabular-nums">
                  {externalItemTotal(item) == null
                    ? "รอกรอกข้อมูล"
                    : money(externalItemTotal(item)!)}
                </td>
                <td className="w-48 border border-[var(--line)] p-2">
                  <textarea
                    aria-label={`หมายเหตุ ${index + 1}`}
                    maxLength={300}
                    rows={2}
                    className={externalInputClass}
                    placeholder="ถ้ามี"
                    value={item.note}
                    onChange={(event) => change(index, { note: event.target.value })}
                  />
                </td>
                <td className="border border-[var(--line)] p-2">
                  <Button
                    variant="ghost"
                    className="relative"
                    disabled={data.items.length <= 1}
                    aria-label={`ลบรายการ ${index + 1}`}
                    onClick={() =>
                      update({ ...data, items: data.items.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 size={18} />
                    <span className="sr-only">ลบรายการ {index + 1}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="my-5 flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="secondary"
          disabled={data.items.length >= 200}
          onClick={() => update({ ...data, items: [...data.items, blankExternalItem()] })}
        >
          <Plus size={17} />
          เพิ่มรายการ
        </Button>
        <strong className="tabular-nums">
          รวม{" "}
          {data.items.some((item) => externalItemTotal(item) == null)
            ? "รอกรอกข้อมูล"
            : `${money(externalTotal(data))} บาท`}
        </strong>
      </div>
      <ExternalField
        label="ข้อความเพิ่มเติมเกี่ยวกับ TOR"
        maxLength={500}
        value={data.metadata.torNote}
        placeholder="เช่น รายละเอียด TOR ตามเอกสารที่แนบ"
        onChange={(torNote) => update({ ...data, metadata: { ...data.metadata, torNote } })}
      />
    </>
  );
}
export function ExternalBudgetFields({ data, update }: Props) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">
          ปีงบประมาณ
          <select
            className={externalInputClass}
            value={data.budgetYear}
            onChange={(event) => update({ ...data, budgetYear: Number(event.target.value) })}
          >
            {Array.from(new Set([data.budgetYear, 2570, 2571, 2572]))
              .sort()
              .map((year) => (
                <option key={year} value={year}>
                  พ.ศ. {year}
                </option>
              ))}
          </select>
        </label>
        <ExternalField
          label="แหล่งเงิน / แหล่งทุนภายนอก"
          required
          maxLength={200}
          value={data.fundSource}
          onChange={(fundSource) => update({ ...data, fundSource })}
        />
        <div className="md:col-span-2">
          <ExternalField
            label="แผนงาน / โครงการ"
            required
            value={data.planName}
            placeholder="ระบุแผนงานหรือโครงการตามงบประมาณที่ได้รับ"
            onChange={(planName) => update({ ...data, planName })}
          />
        </div>
      </div>
      <h3 className="mb-4 mt-7 font-bold">รหัสงบประมาณตามแบบฟอร์ม</h3>
      <div className="grid gap-5 md:grid-cols-2">
        {(
          [
            ["sourceCode", "รหัสแหล่งเงิน", "เช่น 2"],
            ["departmentCode", "รหัสหน่วยงาน", "เช่น 2301"],
            ["fundCode", "รหัสกองทุน", "เช่น 6"],
            ["activityCode", "รหัสกิจกรรม", "ระบุรหัสที่ได้รับจัดสรร"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <ExternalField
            key={key}
            label={label}
            maxLength={50}
            required
            value={data.budgetCodes[key]}
            placeholder={placeholder}
            onChange={(value) =>
              update({ ...data, budgetCodes: { ...data.budgetCodes, [key]: value } })
            }
          />
        ))}
      </div>
      <label className="mb-5 mt-7 block text-sm font-semibold">
        วิธีดำเนินการด้านการเงิน *
        <select
          required
          className={externalInputClass}
          value={data.advanceFundingOption}
          onChange={(event) =>
            update({
              ...data,
              advanceFundingOption: event.target.value as ExternalDraft["advanceFundingOption"],
            })
          }
        >
          <option value="">กรุณาเลือก</option>
          {fundingOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <VendorPicker
        value={data.vendor}
        newVendorName={data.vendor.kind === "new" ? data.vendor.vendorName : ""}
        onChange={(vendor) =>
          update({
            ...data,
            vendor: vendor.kind === "new" ? { ...vendor, vendorName: "" } : vendor,
          })
        }
        onNewVendorNameChange={(vendorName) =>
          update({ ...data, vendor: { kind: "new", vendorName } })
        }
        required={data.advanceFundingOption === "faculty_direct_pay_credit_vendor"}
      />
      <p className="mt-4 text-sm text-[var(--line-dark)]">
        ข้อมูลส่วนนี้ใช้ส่งต่อในสายอนุมัติ POL-01 เดิม ไม่เพิ่มช่องลายเซ็นที่ไม่มีในแบบพิมพ์ต้นฉบับ
      </p>
    </>
  );
}
