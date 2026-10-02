"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, Check, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import { AttachmentPicker } from "../../../components/attachment-picker";
import { Button, PageHeader } from "../../../components/ui";
import { formatAttachmentSize, type SelectedAttachment } from "../../../lib/request-attachments";
import { uploadRequestAttachments } from "../../../lib/request-attachments.client";
import { VendorPicker, type VendorChoice } from "../../new/vendor-picker";
import { resubmitReturnedRequest, updateReturnedRequest } from "./actions";
import type { ReturnedRequestEditData, ReturnedRequestItem } from "./types";

const fieldClass =
  "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3.5 py-2.5 text-base text-[var(--ink)] outline-none transition placeholder:text-stone-500 hover:border-stone-900 focus:border-[var(--blue)] focus:ring-2 focus:ring-blue-100 sm:text-sm";

const loanOptions: Array<{
  value: ReturnedRequestEditData["advanceFundingOption"];
  label: string;
}> = [
  {
    value: "borrow_before_purchase",
    label: "ต้องการยืมเงินก่อน (ต้องแนบสัญญายืมในเอกสารแนบ)",
  },
  {
    value: "reimburse_after_purchase",
    label: "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)",
  },
  {
    value: "faculty_direct_pay_credit_vendor",
    label:
      "ไม่ต้องการยืมเงิน (มอบงานพัสดุจัดซื้อ/จ้าง กรณีร้านค้าให้เครดิตคณะและจ่ายตรงกับร้านค้า)",
  },
];

function currency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 max-w-full border border-[var(--line-dark)] bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      </header>
      <div className="min-w-0 p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function ReturnedRequestEditor({ initial }: { initial: ReturnedRequestEditData }) {
  const router = useRouter();
  const [kind, setKind] = useState(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [rationale, setRationale] = useState(initial.rationale);
  const [requiredDate, setRequiredDate] = useState(initial.requiredDate);
  const [budgetYear, setBudgetYear] = useState(String(initial.budgetYear));
  const [fundSource, setFundSource] = useState(initial.fundSource);
  const [planName, setPlanName] = useState(initial.planName);
  const [expenseCategory, setExpenseCategory] = useState(initial.expenseCategory);
  const [loanRequirement, setLoanRequirement] = useState(initial.advanceFundingOption);
  const [departmentCode, setDepartmentCode] = useState(initial.departmentCode);
  const [fundCode, setFundCode] = useState(initial.fundCode);
  const [activityCode, setActivityCode] = useState(initial.activityCode);
  const [items, setItems] = useState<ReturnedRequestItem[]>(initial.items);
  const [newAttachments, setNewAttachments] = useState<SelectedAttachment[]>([]);
  const [vendorSelection, setVendorSelection] = useState<VendorChoice>(
    initial.vendor.kind === "registered"
      ? {
          kind: "registered",
          vendorId: initial.vendor.vendorId,
          vendorName: initial.vendor.vendorName,
        }
      : initial.vendor.kind === "new"
        ? { kind: "new" }
        : { kind: "none" },
  );
  const [newVendorName, setNewVendorName] = useState(
    initial.vendor.kind === "new" ? initial.vendor.vendorName : "",
  );
  const [error, setError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const requiredAttachmentCount =
    Number(loanRequirement === "borrow_before_purchase") + Number(vendorSelection.kind === "new");
  const totalAttachmentCount = initial.attachments.length + newAttachments.length;

  function updateItem(index: number, patch: Partial<ReturnedRequestItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function validate() {
    if (!title.trim() || !rationale.trim() || !requiredDate) {
      return "กรุณากรอกชื่อคำขอ เหตุผลความจำเป็น และวันที่ต้องการใช้ให้ครบ";
    }
    if (requiredDate < new Date().toISOString().slice(0, 10)) {
      return "วันที่ต้องการใช้ต้องเป็นวันนี้หรือวันถัดไป";
    }
    if (
      !items.length ||
      items.some(
        (item) =>
          !item.description.trim() || !item.unit.trim() || item.quantity <= 0 || item.unitPrice < 0,
      )
    ) {
      return "กรุณาตรวจสอบรายการ จำนวน หน่วย และราคาให้ครบถ้วน";
    }
    if (!departmentCode.trim() || !fundCode.trim() || !activityCode.trim()) {
      return "กรุณากรอกรหัสหน่วยงาน รหัสกองทุน และรหัสกิจกรรมให้ครบถ้วน";
    }
    if (loanRequirement === "faculty_direct_pay_credit_vendor" && vendorSelection.kind === "none") {
      return "กรุณาเลือกผู้ประกอบการสำหรับกรณีจ่ายตรงกับร้านค้า";
    }
    if (vendorSelection.kind === "new" && !newVendorName.trim()) {
      return "กรุณาระบุชื่อผู้ประกอบการรายใหม่";
    }
    if (totalAttachmentCount < requiredAttachmentCount) {
      return `กรุณาแนบเอกสารที่กำหนดอย่างน้อย ${requiredAttachmentCount} ไฟล์`;
    }
    if (totalAttachmentCount > 10) return "เอกสารแนบรวมต้องไม่เกิน 10 ไฟล์";
    return "";
  }

  function handleResubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError("");
    setProgressMessage("กำลังบันทึกการแก้ไข...");
    startTransition(async () => {
      const updateResult = await updateReturnedRequest(initial.id, {
        kind,
        title,
        rationale,
        requiredDate,
        budgetYear: Number(budgetYear),
        fundSource,
        planName,
        expenseCategory,
        formData: {
          advanceFundingOption: loanRequirement,
          requiresLoanAgreement: loanRequirement === "borrow_before_purchase",
          vendor:
            vendorSelection.kind === "registered"
              ? {
                  type: "registered",
                  id: vendorSelection.vendorId,
                  name: vendorSelection.vendorName,
                }
              : vendorSelection.kind === "new"
                ? { type: "new", id: null, name: newVendorName.trim() }
                : null,
          requiresVendorDocuments: vendorSelection.kind === "new",
          budgetCodes: {
            departmentCode: departmentCode.trim(),
            fundCode: fundCode.trim(),
            activityCode: activityCode.trim(),
          },
        },
        items: items.map((item, index) => ({
          line_no: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
        })),
      });
      if (updateResult.error) {
        setError(updateResult.error);
        setProgressMessage("");
        return;
      }

      if (newAttachments.length > 0) setProgressMessage("กำลังอัปโหลดเอกสารเพิ่มเติม...");
      const uploadResult = await uploadRequestAttachments(
        initial.id,
        newAttachments,
        ({ completed, total: uploadTotal, currentFileName }) =>
          setProgressMessage(
            currentFileName
              ? `กำลังอัปโหลด ${completed + 1}/${uploadTotal}: ${currentFileName}`
              : `อัปโหลดเอกสารครบ ${completed}/${uploadTotal} ไฟล์แล้ว`,
          ),
        { preserveExisting: true },
      );
      if (uploadResult.error) {
        setError(uploadResult.error);
        setProgressMessage("");
        return;
      }

      setProgressMessage("กำลังส่งคำขอกลับเข้าสู่สายอนุมัติ...");
      const resubmitResult = await resubmitReturnedRequest(initial.id);
      if (resubmitResult.error || !resubmitResult.requestNo) {
        setError(resubmitResult.error ?? "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
        setProgressMessage("");
        return;
      }

      router.push(`/requests/${resubmitResult.requestNo}`);
      router.refresh();
    });
  }

  return (
    <AppShell>
      <PageHeader
        title={`แก้ไข ${initial.requestNo}`}
        description="แก้ไขข้อมูลตามความเห็นของผู้ตรวจสอบ แล้วส่งกลับเข้าสู่ขั้นตอนเดิม"
      />

      <div className="my-5 border border-amber-300 bg-amber-50 p-5 text-amber-950" role="status">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 shrink-0 text-amber-700" size={21} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-bold">เหตุผลที่ส่งกลับแก้ไข</h2>
            <p className="mt-1 break-words text-sm leading-6">{initial.returnReason}</p>
            <p className="mt-2 text-sm text-amber-800">
              ระบบจะใช้เลขคำขอเดิมและเก็บประวัติการดำเนินการทั้งหมดไว้
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 border border-red-300 bg-[var(--red-soft)] p-4 text-sm text-[var(--red)]"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
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

        <EditSection
          title="รายการพัสดุหรือบริการ"
          description="แก้ไขรายการ จำนวน หน่วย และราคา ระบบจะคำนวณยอดรวมใหม่อัตโนมัติ"
        >
          <div className="max-w-full overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-stone-100 text-left text-stone-700">
                <tr>
                  <th className="p-3">รายการ</th>
                  <th className="w-24 p-3">จำนวน</th>
                  <th className="w-28 p-3">หน่วย</th>
                  <th className="w-36 p-3">ราคาต่อหน่วย</th>
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
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        aria-label={`หน่วยรายการที่ ${index + 1}`}
                        className={fieldClass}
                        value={item.unit}
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
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(index, { unitPrice: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums">
                      {currency(item.quantity * item.unitPrice)}
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="grid size-10 place-items-center text-stone-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-3 focus-visible:outline-[var(--focus)]"
                        aria-label={`ลบรายการที่ ${index + 1}`}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
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
                  <td colSpan={4} className="p-4 text-right font-semibold">
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
            onClick={() =>
              setItems((current) => [
                ...current,
                { description: "", quantity: 1, unit: "ชิ้น", unitPrice: 0 },
              ])
            }
          >
            <Plus size={17} aria-hidden="true" /> เพิ่มรายการ
          </Button>
        </EditSection>

        <EditSection
          title="งบประมาณและผู้ประกอบการ"
          description="ตรวจสอบแหล่งเงิน รหัสงบประมาณ และแนวทางการชำระเงิน"
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ปีงบประมาณ</span>
              <input
                type="number"
                className={fieldClass}
                value={budgetYear}
                onChange={(event) => setBudgetYear(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">แผนงาน</span>
              <input
                className={fieldClass}
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">หมวดรายจ่าย</span>
              <input
                className={fieldClass}
                value={expenseCategory}
                onChange={(event) => setExpenseCategory(event.target.value)}
              />
            </label>
          </div>
          <fieldset className="mt-6">
            <legend className="text-sm font-bold">ความต้องการยืมเงิน *</legend>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {loanOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 border p-4 ${loanRequirement === option.value ? "border-orange-500 bg-orange-50" : "border-[var(--line)] bg-white"}`}
                >
                  <input
                    type="radio"
                    name="loan-requirement"
                    value={option.value}
                    checked={loanRequirement === option.value}
                    onChange={() => setLoanRequirement(option.value)}
                    className="mt-1 accent-orange-600"
                  />
                  <span className="text-sm leading-6">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <VendorPicker
              value={vendorSelection}
              onChange={setVendorSelection}
              newVendorName={newVendorName}
              onNewVendorNameChange={setNewVendorName}
              required={loanRequirement === "faculty_direct_pay_credit_vendor"}
            />
          </div>
          <div className="mt-6 grid gap-5 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">แหล่งเงินทุน *</span>
              <select
                className={fieldClass}
                value={fundSource}
                onChange={(event) => setFundSource(event.target.value)}
              >
                <option>เงินงบประมาณแผ่นดิน</option>
                <option>เงินรายได้</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">รหัสหน่วยงาน *</span>
              <input
                className={fieldClass}
                value={departmentCode}
                onChange={(event) => setDepartmentCode(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">รหัสกองทุน *</span>
              <input
                className={fieldClass}
                value={fundCode}
                onChange={(event) => setFundCode(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">รหัสกิจกรรม *</span>
              <input
                className={fieldClass}
                value={activityCode}
                onChange={(event) => setActivityCode(event.target.value)}
              />
            </label>
          </div>
        </EditSection>

        <EditSection
          title="เอกสารแนบ"
          description="เอกสารเดิมจะคงอยู่ สามารถแนบเอกสารเพิ่มเติมตามข้อสังเกตของผู้ตรวจสอบได้"
        >
          {initial.attachments.length > 0 && (
            <ul
              aria-label="เอกสารแนบเดิม"
              className="mb-5 divide-y divide-[var(--line)] border border-[var(--line)]"
            >
              {initial.attachments.map((attachment) => (
                <li key={attachment.id} className="flex min-w-0 items-center gap-3 p-3">
                  <FileText
                    className="shrink-0 text-[var(--orange)]"
                    size={20}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{attachment.fileName}</p>
                    <p className="text-xs text-stone-500">
                      {formatAttachmentSize(attachment.sizeBytes)} · เอกสารเดิม
                    </p>
                  </div>
                  <Link
                    className="min-h-10 px-3 py-2 text-sm font-semibold text-[var(--blue)] hover:underline"
                    href={`/api/request-attachments/${attachment.id}`}
                  >
                    ดาวน์โหลด
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AttachmentPicker
            files={newAttachments}
            onChange={setNewAttachments}
            disabled={isPending}
          />
        </EditSection>

        <section className="border border-[var(--line-dark)] bg-[var(--ink)] p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <h2 className="font-bold">พร้อมส่งกลับเข้าสู่กระบวนการ</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              ระบบจะส่งกลับไปยังขั้นตอนที่ {initial.currentStep} โดยใช้เลขคำขอ {initial.requestNo}{" "}
              และไม่ลบประวัติเดิม
            </p>
            <p className="mt-2 min-h-5 text-sm font-semibold text-orange-300" aria-live="polite">
              {progressMessage}
            </p>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:mt-0 sm:flex-row">
            <Link
              href={`/requests/${initial.requestNo}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-slate-500 px-4 font-semibold hover:bg-slate-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <ArrowLeft size={17} aria-hidden="true" /> ยกเลิก
            </Link>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleResubmit}
              className="min-w-56"
            >
              <Check size={17} aria-hidden="true" />{" "}
              {isPending ? "กำลังดำเนินการ..." : "บันทึกและส่งคำขอใหม่"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
