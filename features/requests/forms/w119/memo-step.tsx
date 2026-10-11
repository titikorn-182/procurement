import { inputClass } from "./constants";
import type { W119FormController } from "./use-w119-form";
type Props = Pick<
  W119FormController,
  | "departmentName"
  | "setDepartmentName"
  | "phone"
  | "setPhone"
  | "documentNo"
  | "setDocumentNo"
  | "memoDate"
  | "setMemoDate"
  | "addressee"
  | "setAddressee"
  | "requestType"
  | "setRequestType"
  | "title"
  | "setTitle"
  | "rationale"
  | "setRationale"
  | "requiredDate"
  | "setRequiredDate"
  | "selectionCriteria"
  | "setSelectionCriteria"
>;
export function MemoStep({
  departmentName,
  setDepartmentName,
  phone,
  setPhone,
  documentNo,
  setDocumentNo,
  memoDate,
  setMemoDate,
  addressee,
  setAddressee,
  requestType,
  setRequestType,
  title,
  setTitle,
  rationale,
  setRationale,
  requiredDate,
  setRequiredDate,
  selectionCriteria,
  setSelectionCriteria,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">ส่วนงาน *</span>
          <input
            className={inputClass}
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">โทรศัพท์ *</span>
          <input
            className={inputClass}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            ที่ / เลขที่หนังสือ *
          </span>
          <input
            className={inputClass}
            value={documentNo}
            onChange={(event) => setDocumentNo(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">วันที่บันทึก *</span>
          <input
            type="date"
            className={inputClass}
            value={memoDate}
            onChange={(event) => setMemoDate(event.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">เรียน *</span>
          <input
            className={inputClass}
            value={addressee}
            onChange={(event) => setAddressee(event.target.value)}
          />
        </label>
      </div>
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
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          เรื่อง ขอซื้อ/จ้าง *
        </span>
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          ความประสงค์ วัตถุประสงค์ และเหตุผลความจำเป็น *
        </span>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          value={rationale}
          onChange={(event) => setRationale(event.target.value)}
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            วันที่ต้องใช้พัสดุ/งานแล้วเสร็จ *
          </span>
          <input
            type="date"
            className={inputClass}
            value={requiredDate}
            onChange={(event) => setRequiredDate(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            หลักเกณฑ์การพิจารณาคัดเลือก
          </span>
          <select
            className={inputClass}
            value={selectionCriteria}
            onChange={(event) =>
              setSelectionCriteria(
                event.target.value === "เกณฑ์ราคาประกอบเกณฑ์อื่น"
                  ? "เกณฑ์ราคาประกอบเกณฑ์อื่น"
                  : "เกณฑ์ราคา",
              )
            }
          >
            <option>เกณฑ์ราคา</option>
            <option>เกณฑ์ราคาประกอบเกณฑ์อื่น</option>
          </select>
        </label>
      </div>
    </div>
  );
}
