import { fieldClass } from "./constants";
import { EditSection } from "./frame";
import type { ReturnedRequestFormController } from "./use-returned-request-form";
type Props = Pick<
  ReturnedRequestFormController,
  | "kind"
  | "setKind"
  | "requiredDate"
  | "setRequiredDate"
  | "title"
  | "setTitle"
  | "rationale"
  | "setRationale"
>;
export function RequestSection({
  kind,
  setKind,
  requiredDate,
  setRequiredDate,
  title,
  setTitle,
  rationale,
  setRationale,
}: Props) {
  return (
    <EditSection
      title="ข้อมูลคำขอ"
      description="ตรวจชื่อเรื่อง เหตุผล และวันที่ต้องการใช้ให้ตรงกับรายการที่แก้ไข"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">ประเภทคำขอ</span>
          <select
            className={fieldClass}
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="purchase">คำขอจัดซื้อ</option>
            <option value="hire">คำขอจัดจ้าง</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">วันที่ต้องการใช้ *</span>
          <input
            type="date"
            className={fieldClass}
            value={requiredDate}
            onChange={(event) => setRequiredDate(event.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold">ชื่อเรื่องคำขอ *</span>
          <input
            className={fieldClass}
            maxLength={300}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold">เหตุผลและความจำเป็น *</span>
          <textarea
            className={`${fieldClass} min-h-28 resize-y`}
            maxLength={5000}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
          />
        </label>
      </div>
    </EditSection>
  );
}
