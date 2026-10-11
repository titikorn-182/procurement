export function EditSection({
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
