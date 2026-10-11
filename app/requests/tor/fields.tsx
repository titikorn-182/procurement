"use client";

/* DIRECTION CONTRACT
 * JOB: prepare one editable TOR per checklist category without leaving step 4.
 * WORLD: inherit POL-01 paper surfaces, Sarabun and square administrative controls.
 * FORM: user-approved A accordion; local extension, no new concept seed required.
 * MATERIAL: real 12-section source template; placeholders never transaction values.
 * FINISH: keyboard-native details, mobile stacking, explicit unsaved/attachment state.
 */
import { useState } from "react";
import { FileDown, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui";
import { createTor, TOR_HEADINGS, torCategoryLabel, type TorDocument } from "./model";
import { createTorAttachment } from "./pdf";
import styles from "./fields.module.css";

const field =
  "min-h-11 w-full min-w-0 border border-[var(--line-dark)] bg-white px-3 py-2 text-base text-[var(--ink)] placeholder:text-stone-600 focus:outline-2 focus:outline-[var(--blue)] sm:text-sm";
const examples = [
  "อธิบายที่มาและความจำเป็นของโครงการ",
  "1. เพื่อ…\n2. เพื่อ…\n3. เพื่อ…",
  "",
  "4.1 ชื่อรายการ… จำนวน… หน่วย…\nคุณลักษณะที่ต้องการ…\n4.2 ชื่อรายการ…",
  "ส่งมอบภายในวันที่… ณ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
  "",
  "แหล่งเงิน… หน่วยงาน… กองทุน… กิจกรรม…\nปีงบประมาณ พ.ศ.… วงเงินเฉพาะประเภทนี้… บาท (…)",
  "",
  "",
  "",
  "",
  "งาน… ผู้ติดต่อ… โทรศัพท์…\nชั้น 1 อาคารปฏิบัติการรวมด้านสังคมศาสตร์ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี 34190",
];

export function TorFields({
  value,
  categories,
  onChange,
  disabled = false,
  subject = "",
  background = "",
}: {
  value: TorDocument[];
  categories: TorDocument["category"][];
  onChange: (docs: TorDocument[]) => void;
  disabled?: boolean;
  subject?: string;
  background?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const shown = [...new Set([...categories, ...value.map((d) => d.category)])];
  function patch(id: string, changes: Partial<TorDocument>) {
    onChange(value.map((d) => (d.attachmentId === id ? { ...d, ...changes } : d)));
  }
  async function preview(doc: TorDocument) {
    setBusy(doc.attachmentId);
    setError("");
    try {
      const result = await createTorAttachment(doc);
      const url = URL.createObjectURL(result.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="my-6 min-w-0 max-w-full" aria-label="จัดทำ TOR แยกตามประเภท">
      <h3 className="text-lg font-bold">แบบรายละเอียดคุณลักษณะเฉพาะ (TOR)</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
        แยก TOR ตามประเภทพัสดุ บันทึกข้อมูลพร้อมคำขอและสร้าง PDF แนบอัตโนมัติเมื่อส่งคำขอ
        แก้ไขต่อได้เมื่อถูกส่งกลับ ไม่ต้องแนบไฟล์ TOR ซ้ำ
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
        ข้อความเงื่อนไขตั้งต้นมาจากแบบตัวอย่าง กรุณาตรวจทานให้เหมาะกับงานซื้อ/จ้าง
        โดยเฉพาะการจ่ายเงินและค่าปรับ การจัดทำ TOR
        ไม่ได้ทำเครื่องหมายเช็คลิสต์หรืออนุมัติให้โดยอัตโนมัติ
      </p>
      {error && (
        <p role="alert" className="my-3 text-[var(--red)]">
          {error}
        </p>
      )}
      {!shown.length && (
        <p className="mt-4 border border-[var(--line)] p-4 text-sm">
          เลือกประเภทพัสดุในเช็คลิสต์ด้านบนเพื่อเริ่มจัดทำ TOR
        </p>
      )}
      <div className="mt-4 divide-y divide-[var(--line)] border-x border-t border-[var(--line)]">
        {shown.map((category) => {
          const doc = value.find((d) => d.category === category);
          return (
            <details
              key={category}
              className={`${styles.category} min-w-0 border-b border-[var(--line)] bg-[var(--paper)]`}
              open={doc ? undefined : false}
            >
              <summary
                className={`${styles.summary} cursor-pointer px-4 py-4 text-lg font-bold text-[var(--orange-dark)] focus-visible:outline-2 focus-visible:outline-[var(--blue)]`}
              >
                {torCategoryLabel(category)}{" "}
                <span className="ml-2 text-sm font-normal text-stone-600">
                  {doc ? "รอแนบ PDF เมื่อส่งคำขอ" : "ยังไม่จัดทำ"}
                </span>
              </summary>
              <div className="min-w-0 space-y-5 px-4 pb-5 sm:px-5">
                {!doc ? (
                  <Button
                    type="button"
                    disabled={disabled || value.length >= 10}
                    onClick={() => onChange([...value, createTor(category, subject, background)])}
                  >
                    เริ่มจัดทำ TOR
                  </Button>
                ) : (
                  <>
                    {!categories.includes(category) && (
                      <p role="alert" className="text-[var(--red)]">
                        ประเภทนี้ถูกนำออกจากเช็คลิสต์ กรุณาเลือกกลับหรือนำ TOR ออกก่อนส่ง
                      </p>
                    )}
                    <div className={`${styles.toolbar} flex flex-wrap justify-end gap-3`}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={disabled || busy !== null}
                        onClick={() => void preview(doc)}
                      >
                        <FileDown size={16} />
                        {busy === doc.attachmentId ? "กำลังสร้าง PDF…" : "ดาวน์โหลดตัวอย่าง PDF"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => {
                          if (
                            window.confirm(
                              `นำ TOR ${torCategoryLabel(category)} ออกจากคำขอ? เอกสารแนบอื่นจะไม่ถูกลบ`,
                            )
                          )
                            onChange(value.filter((d) => d.attachmentId !== doc.attachmentId));
                        }}
                      >
                        <Trash2 size={16} />
                        นำ TOR ออก
                      </Button>
                    </div>
                    <fieldset disabled={disabled} className="min-w-0 space-y-5">
                      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        {(
                          [
                            ["subject", "เพื่อประกอบเอกสารขอซื้อ/จ้าง"],
                            ["project", "ชื่อโครงการหรือกิจกรรม"],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="min-w-0 text-sm">
                            {label} *
                            <input
                              className={`${field} mt-2`}
                              maxLength={300}
                              aria-required="true"
                              value={doc[key]}
                              onChange={(e) => patch(doc.attachmentId, { [key]: e.target.value })}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="grid items-start gap-x-6 gap-y-2 sm:grid-cols-2">
                        {TOR_HEADINGS.map((heading, index) => (
                          <details
                            key={heading}
                            open={index < 2}
                            className="min-w-0 border-t border-[var(--line)] pt-1"
                          >
                            <summary className="cursor-pointer py-2 font-semibold">
                              {index + 1}. {heading}{" "}
                              {doc.sections[index].trim() ? "" : "— ยังไม่กรอก"}
                            </summary>
                            <label className="block text-sm">
                              <span className="sr-only">
                                {index + 1}. {heading}
                              </span>
                              <textarea
                                className={`${field} mt-2`}
                                rows={index === 2 ? 12 : index === 3 ? 8 : 4}
                                maxLength={5000}
                                aria-required="true"
                                placeholder={examples[index]}
                                value={doc.sections[index]}
                                onChange={(e) =>
                                  patch(doc.attachmentId, {
                                    sections: doc.sections.map((s, i) =>
                                      i === index ? e.target.value : s,
                                    ),
                                  })
                                }
                              />
                            </label>
                          </details>
                        ))}
                      </div>
                      <details className="border-t border-[var(--line)] pt-3">
                        <summary className="cursor-pointer py-2 font-bold">
                          ผู้จัดทำขอบเขตงาน (อย่างน้อย 1 คน)
                        </summary>
                        <div className="mt-3 space-y-4">
                          {doc.authors.map((person, index) => (
                            <div key={index} className="grid gap-4 sm:grid-cols-2">
                              {(
                                [
                                  ["name", "ชื่อผู้จัดทำ"],
                                  ["position", "ตำแหน่ง"],
                                ] as const
                              ).map(([key, label]) => (
                                <label key={key} className="text-sm">
                                  {label} คนที่ {index + 1}
                                  <input
                                    className={`${field} mt-2`}
                                    maxLength={key === "name" ? 200 : 300}
                                    aria-required={index === 0}
                                    value={person[key]}
                                    onChange={(e) =>
                                      patch(doc.attachmentId, {
                                        authors: doc.authors.map((p, i) =>
                                          i === index ? { ...p, [key]: e.target.value } : p,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </details>
                    </fieldset>
                  </>
                )}
              </div>
            </details>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="mt-3 text-sm text-stone-600">
          TOR {value.length} ฉบับ · นับรวมในขีดจำกัดเอกสารแนบ 10 ไฟล์ / 50 MB ·
          ข้อมูลยังไม่ถูกบันทึกจนกว่าจะส่งคำขอ
        </p>
      )}
    </section>
  );
}
