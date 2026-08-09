export const PROCUREMENT_REPORT_URL = "https://datastudio.google.com/reporting/8d47754d-944c-4730-a95b-21c7960e84f4/page/AEt2F";

const PROCUREMENT_REPORT_EMBED_URL = "https://datastudio.google.com/embed/reporting/8d47754d-944c-4730-a95b-21c7960e84f4/page/AEt2F";

export function ProcurementReport({ className }: { className: string }) {
  return (
    <>
      <div className="flex flex-col gap-2 border-b border-[var(--line)] bg-stone-100 px-4 py-3 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between">
        <span>รายงานจาก Google Looker Studio จะแสดงเมื่อเจ้าของรายงานเปิดสิทธิ์การฝังบนเว็บไซต์อื่น</span>
        <a href={PROCUREMENT_REPORT_URL} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-[var(--orange-dark)] underline-offset-4 hover:underline">
          เปิดรายงานในแท็บใหม่
        </a>
      </div>
      <iframe
        src={PROCUREMENT_REPORT_EMBED_URL}
        title="รายงานสารสนเทศการบริหารงานพัสดุ"
        className={`block w-full bg-white ${className}`}
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </>
  );
}
