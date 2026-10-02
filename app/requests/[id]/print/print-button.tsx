"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      className="print-hidden inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white hover:bg-[var(--orange-dark)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      onClick={() => window.print()}
    >
      <Printer size={17} aria-hidden="true" />
      พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
