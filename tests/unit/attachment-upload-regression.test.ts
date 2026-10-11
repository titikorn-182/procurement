import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadRequestAttachments } from "../../app/lib/request-attachments.client";
import { uploadPaymentAttachments } from "../../app/lib/payment-attachments.client";

const mock = vi.hoisted(() => ({
  user: vi.fn(),
  existing: vi.fn(),
  upload: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  deleteRows: vi.fn(),
}));
vi.mock("../../lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mock.user },
    from: () => ({
      select: () => ({ eq: mock.existing }),
      upsert: mock.upsert,
      delete: () => ({ in: mock.deleteRows }),
    }),
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
  }),
}));
const requestId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const fileId = "33333333-3333-4333-8333-333333333333";
const selections = () => [
  { id: fileId, file: new File(["synthetic"], "หลักฐาน.pdf", { type: "application/pdf" }) },
];
beforeEach(() => {
  vi.resetAllMocks();
  mock.user.mockResolvedValue({ data: { user: { id: ownerId } } });
  mock.existing.mockResolvedValue({ data: [{ storage_path: "original.pdf" }], error: null });
  for (const fn of [mock.upload, mock.upsert, mock.remove, mock.deleteRows])
    fn.mockResolvedValue({ error: null });
});
describe.each([
  {
    name: "POL01 retained attachments",
    prefix: "requests",
    upload: (files: ReturnType<typeof selections>) =>
      uploadRequestAttachments(requestId, files, undefined, { preserveExisting: true }),
  },
  {
    name: "POL02 retained attachments",
    prefix: "payments",
    upload: (files: ReturnType<typeof selections>) => uploadPaymentAttachments(requestId, files),
  },
])("$name", ({ prefix, upload }) => {
  it("keeps originals while attaching a new file and records the signed-in owner", async () => {
    expect(await upload(selections())).toEqual({ error: null });
    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        storage_path: `${prefix}/${requestId}/${fileId}.pdf`,
        uploaded_by: ownerId,
        file_name: "หลักฐาน.pdf",
      }),
      { onConflict: "storage_path" },
    );
    expect(mock.deleteRows).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it("does not upload when the session has expired", async () => {
    mock.user.mockResolvedValue({ data: { user: null } });
    expect((await upload(selections())).error).toContain("เข้าสู่ระบบ");
    expect(mock.upload).not.toHaveBeenCalled();
  });
  it("reports storage failure without deleting retained originals", async () => {
    mock.upload.mockResolvedValue({ error: { message: "network unavailable" } });
    expect((await upload(selections())).error).toContain("ฉบับร่าง");
    expect(mock.upsert).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it("cleans up a newly uploaded file when metadata fails and can retry", async () => {
    mock.upsert.mockResolvedValueOnce({ error: { message: "metadata unavailable" } });
    expect((await upload(selections())).error).toBeTruthy();
    expect(mock.remove).toHaveBeenCalledExactlyOnceWith([`${prefix}/${requestId}/${fileId}.pdf`]);
    expect(await upload(selections())).toEqual({ error: null });
  });
});
