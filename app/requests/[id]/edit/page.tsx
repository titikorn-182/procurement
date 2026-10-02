import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/ui";
import { getReturnedRequestForEdit } from "../../../lib/live-data";
import { ReturnedRequestEditor } from "./returned-request-editor";

export default async function EditReturnedRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await getReturnedRequestForEdit(id);

  if (!data && !error) notFound();
  if (!data) {
    return (
      <AppShell>
        <PageHeader
          title="ไม่สามารถแก้ไขคำขอได้"
          description="ตรวจสอบสถานะและสิทธิ์ของบัญชีผู้ใช้"
        />
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </div>
      </AppShell>
    );
  }

  return <ReturnedRequestEditor initial={data} />;
}
