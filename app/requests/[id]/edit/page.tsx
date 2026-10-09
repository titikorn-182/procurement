import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { PageHeader } from "../../../components/ui";
import { getReturnedRequestForEdit } from "../../../lib/live-data";
import { ReturnedRequestEditor } from "./returned-request-editor";
import { W119Form } from "../../w119/w119-form";
import { sarabunPsk } from "@/app/components/print/fonts";

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

  return data.formType === "w119" ? (
    <W119Form initial={data} printFontClassName={sarabunPsk.className} />
  ) : (
    <ReturnedRequestEditor initial={data} />
  );
}
