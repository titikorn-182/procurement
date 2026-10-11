"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "../components/ui";
import { CatalogPicker } from "../requests/new/catalog-picker";
import { searchProcurementCatalog } from "../requests/new/catalog-actions";
import type { CatalogEntry, CatalogQuery, CatalogResult } from "../requests/new/catalog-schema";
import { searchCatalogManagement } from "./actions";
import { CatalogEditor } from "./catalog-editor";
import { saveCatalogItem, uploadCatalogImage } from "./actions";

/** THESIS: Extend the existing reference catalog into a maintainable register.
 * OWN-WORLD: Inherit DESIGN.md's square paper ledger, Sarabun, orange actions.
 * STORY: Search the shared master, inspect provenance, then edit as an admin.
 * FIRST VIEWPORT: Title and add action; searchable shared-edge catalog below.
 * FORM: Precise extension of the user's supplied catalog; no new visual world.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function CatalogWorkspace({
  canManage,
  services,
}: {
  canManage: boolean;
  services?: {
    load: (query: CatalogQuery) => Promise<CatalogResult>;
    save: typeof saveCatalogItem;
    upload: typeof uploadCatalogImage;
  };
}) {
  const [editing, setEditing] = useState<{ id: string; entry: CatalogEntry | null } | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);
  const addButton = useRef<HTMLButtonElement>(null);
  const browseHeading = useRef<HTMLDivElement>(null);
  const load = services?.load ?? (canManage ? searchCatalogManagement : searchProcurementCatalog);
  function closeEditor() {
    setEditing(null);
    requestAnimationFrame(() => addButton.current?.focus());
  }
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Procurement Data Catalog"
        description="ฐานข้อมูลพัสดุและราคาอ้างอิงเดียวกับแค็ตตาล็อกในคำขอหลักการ POL-01"
        action={
          canManage && !editing ? (
            <button
              ref={addButton}
              type="button"
              disabled={!categories.length}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white hover:bg-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                setNotice("");
                setEditing({ id: crypto.randomUUID(), entry: null });
              }}
            >
              <Plus size={18} aria-hidden="true" /> เพิ่มรายการพัสดุ
            </button>
          ) : undefined
        }
      />
      <p className="max-w-3xl text-sm text-stone-700">
        {canManage
          ? "ผู้ดูแลระบบเพิ่มหรือแก้ไขข้อมูลและรูปประกอบได้ ราคาเดิมเก็บเป็นประวัติ และข้อมูลในคำขอที่บันทึกแล้วจะไม่เปลี่ยนตาม"
          : "ค้นหาและตรวจสอบข้อมูลก่อนใช้งาน การเพิ่มหรือแก้ไขข้อมูลและรูปประกอบดำเนินการโดยผู้ดูแลระบบ"}{" "}
        <Link href="/requests/new" className="underline underline-offset-4">
          ไปสร้างคำขอ POL-01
        </Link>
      </p>
      {notice && (
        <p
          role="status"
          className="border border-green-300 bg-[var(--green-soft)] p-4 text-sm text-[var(--green)]"
        >
          {notice}
        </p>
      )}
      {editing && (
        <CatalogEditor
          key={editing.id}
          itemId={editing.id}
          entry={editing.entry}
          categories={categories}
          save={services?.save}
          upload={services?.upload}
          onCancel={closeEditor}
          onSaved={() => {
            setEditing(null);
            setRevision((value) => value + 1);
            setNotice(
              "บันทึกข้อมูลแล้ว แค็ตตาล็อกใน /requests/new จะใช้ข้อมูลล่าสุดเมื่อเปิดหรือค้นหาใหม่",
            );
            requestAnimationFrame(() => browseHeading.current?.focus());
          }}
        />
      )}
      <div hidden={!!editing} ref={browseHeading} tabIndex={-1}>
        <CatalogPicker
          key={revision}
          variant="browse"
          load={load}
          onCategories={setCategories}
          onEdit={
            canManage
              ? (entry) => {
                  setNotice("");
                  setEditing({ id: entry.item_id, entry });
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
