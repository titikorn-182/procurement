"use client";
import { useFormStatus } from "react-dom";

export function ListSearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 border border-[var(--line-dark)] bg-white px-4 font-semibold disabled:opacity-50"
    >
      {pending ? "กำลังค้นหา…" : "ค้นหา"}
    </button>
  );
}
