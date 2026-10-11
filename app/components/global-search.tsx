export function GlobalSearch({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" role="search" className="flex min-w-0 flex-1 gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">ค้นหาคำขอทุกประเภท</span>
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          maxLength={200}
          className="min-h-11 w-full min-w-0 border border-[var(--line)] bg-white px-3 text-base"
          placeholder="เลขคำขอ เรื่อง หรือผู้ยื่น"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 shrink-0 border border-[var(--line)] bg-white px-3 font-semibold hover:bg-stone-100"
      >
        ค้นหา
      </button>
    </form>
  );
}
