export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--paper-warm)] p-6">
      <p
        role="status"
        className="mx-auto max-w-3xl border border-[var(--line)] bg-[var(--paper)] p-6 font-semibold"
      >
        กำลังโหลดข้อมูล กรุณารอสักครู่…
      </p>
    </main>
  );
}
