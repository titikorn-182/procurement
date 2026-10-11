export function SectionCard({
  title,
  description,
  children,
  disabled = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </header>
      <fieldset disabled={disabled} className="min-w-0 p-5 sm:p-6">
        {children}
      </fieldset>
    </section>
  );
}
