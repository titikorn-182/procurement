"use client";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { listHref, type ListFilters } from "@/lib/pagination";

export function RequestExportButton({
  filters,
  disabled,
}: {
  filters: ListFilters;
  disabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(listHref("/requests/export", filters, 1), { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());
      if (!response.headers.get("content-type")?.includes("text/csv"))
        throw new Error("ส่งออกไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `procurement-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งออกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={download}
        disabled={disabled || pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold disabled:opacity-50"
      >
        <Download size={17} aria-hidden="true" />
        {pending ? "กำลังส่งออก…" : "ส่งออก CSV ทั้งหมดตามตัวกรอง"}
      </button>
      {pending && (
        <p role="status" className="mt-2 text-sm">
          กำลังรวบรวมข้อมูลทุกหน้า กรุณารอสักครู่
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 max-w-lg break-words text-sm text-[var(--red)]">
          {error}
        </p>
      )}
    </div>
  );
}
