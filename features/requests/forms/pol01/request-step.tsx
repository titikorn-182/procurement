import { inputClass } from "./constants";
import type { Pol01FormController } from "./use-pol01-form";
type Props = Pick<
  Pol01FormController,
  | "requestType"
  | "setRequestType"
  | "title"
  | "setTitle"
  | "rationale"
  | "setRationale"
  | "requiredDate"
  | "setRequiredDate"
>;
export function RequestStep({
  requestType,
  setRequestType,
  title,
  setTitle,
  rationale,
  setRationale,
  requiredDate,
  setRequiredDate,
}: Props) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">ประเภทคำขอ</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["purchase", "คำขอจัดซื้อ", "จัดหาพัสดุหรือครุภัณฑ์"],
            ["hire", "คำขอจัดจ้าง", "จัดหางานจ้างหรือบริการ"],
          ].map(([value, label, description]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-xl border p-4 transition ${requestType === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="request-type"
                  checked={requestType === value}
                  onChange={() => setRequestType(value as "purchase" | "hire")}
                  className="mt-1 accent-orange-500"
                />
                <span>
                  <span className="block font-semibold text-slate-900">{label}</span>
                  <span className="mt-1 block text-sm text-slate-500">{description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        หน่วยงานผู้ขอจะถูกดึงจากโปรไฟล์ผู้เข้าสู่ระบบโดยอัตโนมัติ
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">ชื่อเรื่องคำขอ *</span>
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          เหตุผลและความจำเป็น *
        </span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
        />
      </label>
      <label className="block max-w-md">
        <span className="mb-2 block text-sm font-semibold text-slate-700">วันที่ต้องการใช้ *</span>
        <input
          type="date"
          className={inputClass}
          value={requiredDate}
          onChange={(event) => setRequiredDate(event.target.value)}
        />
      </label>
    </div>
  );
}
