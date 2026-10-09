import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  request: vi.fn(),
  requestFilter: vi.fn(),
  files: vi.fn(),
  readFilter: vi.fn(),
  deleteFilter: vi.fn(),
  deleteIds: vi.fn(),
  deleted: vi.fn(),
  remove: vi.fn(),
  bucket: vi.fn(),
  revalidate: vi.fn(),
  safeError: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "profiles")
        return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
      if (table === "procurement_requests") {
        const query = { select: () => query, eq: mocks.requestFilter, maybeSingle: mocks.request };
        mocks.requestFilter.mockReturnValue(query);
        return query;
      }
      return {
        select: () => ({
          eq: (...args: unknown[]) => {
            mocks.readFilter(...args);
            return mocks.files();
          },
        }),
        delete: () => {
          const query = { eq: mocks.deleteFilter, in: mocks.deleteIds, select: mocks.deleted };
          mocks.deleteFilter.mockReturnValue(query);
          mocks.deleteIds.mockReturnValue(query);
          return query;
        },
      };
    },
    storage: {
      from: (...args: unknown[]) => {
        mocks.bucket(...args);
        return { remove: mocks.remove };
      },
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: mocks.safeError }));
import { removeReturnedW119Attachments } from "../../app/requests/[id]/edit/attachment-actions";

const requestId = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const removed = "33333333-3333-4333-8333-333333333333";
const retained = "44444444-4444-4444-8444-444444444444";
const file = (id: string) => ({
  id,
  uploaded_by: owner,
  storage_path: `requests/${requestId}/${id}.pdf`,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: owner } }, error: null });
  mocks.profile.mockResolvedValue({ data: { active: true }, error: null });
  mocks.request.mockResolvedValue({
    data: { request_no: "TEST-W119", form_data: { formType: "w119" } },
    error: null,
  });
  mocks.files.mockResolvedValue({ data: [file(removed), file(retained)], error: null });
  mocks.deleted.mockResolvedValue({ data: [file(removed)], error: null });
  mocks.remove.mockResolvedValue({ data: [{ name: file(removed).storage_path }], error: null });
  mocks.safeError.mockReturnValue("นำเอกสารออกแล้ว แต่ลบไฟล์จากพื้นที่จัดเก็บไม่สมบูรณ์ (TEST)");
});

describe("returned W119 attachment removal", () => {
  it("deletes only selected owner files using scoped metadata and storage operations", async () => {
    expect(await removeReturnedW119Attachments(requestId, [removed])).toEqual({
      removedIds: [removed],
      error: null,
      warning: null,
    });
    expect(mocks.requestFilter.mock.calls).toEqual([
      ["id", requestId],
      ["requester_id", owner],
      ["status", "returned"],
    ]);
    expect(mocks.readFilter).toHaveBeenCalledWith("request_id", requestId);
    expect(mocks.deleteFilter.mock.calls).toEqual([
      ["request_id", requestId],
      ["uploaded_by", owner],
    ]);
    expect(mocks.deleteIds).toHaveBeenCalledWith("id", [removed]);
    expect(mocks.bucket).toHaveBeenCalledWith("procurement-documents");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([file(removed).storage_path]);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.deleted.mock.invocationCallOrder[0],
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/requests/TEST-W119/print");
  });
  it("allows removing all original files only after a replacement is present", async () => {
    const replacement = "55555555-5555-4555-8555-555555555555";
    mocks.files.mockResolvedValue({ data: [file(removed), file(retained), file(replacement)] });
    mocks.deleted.mockResolvedValue({ data: [file(removed), file(retained)] });
    expect((await removeReturnedW119Attachments(requestId, [removed, retained])).error).toBeNull();
    expect(mocks.remove).toHaveBeenCalledWith([
      file(removed).storage_path,
      file(retained).storage_path,
    ]);
  });
  it("rejects deleting the last remaining attachments", async () => {
    expect((await removeReturnedW119Attachments(requestId, [removed, retained])).error).toContain(
      "อย่างน้อย 1 ไฟล์",
    );
    expect(mocks.deleted).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each([
    "anonymous",
    "auth-error",
    "inactive",
    "profile-error",
    "not-returned-owner",
    "request-error",
    "other-form",
  ])("fails closed for %s", async (mode) => {
    if (mode === "anonymous") mocks.getUser.mockResolvedValue({ data: { user: null } });
    if (mode === "auth-error")
      mocks.getUser.mockResolvedValue({ data: { user: { id: owner } }, error: {} });
    if (mode === "inactive") mocks.profile.mockResolvedValue({ data: { active: false } });
    if (mode === "profile-error") mocks.profile.mockResolvedValue({ data: null, error: {} });
    if (mode === "not-returned-owner") mocks.request.mockResolvedValue({ data: null });
    if (mode === "request-error") mocks.request.mockResolvedValue({ data: null, error: {} });
    if (mode === "other-form")
      mocks.request.mockResolvedValue({ data: { form_data: { formType: "standard" } } });
    expect((await removeReturnedW119Attachments(requestId, [removed])).error).toBeTruthy();
    expect(mocks.deleted).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("refuses another uploader's attachment even inside an owned request", async () => {
    mocks.files.mockResolvedValue({
      data: [{ ...file(removed), uploaded_by: retained }, file(retained)],
    });
    expect((await removeReturnedW119Attachments(requestId, [removed])).error).toContain("คุณแนบ");
    expect(mocks.deleted).not.toHaveBeenCalled();
  });
  it("never derives deletion paths from missing or foreign attachment IDs", async () => {
    mocks.files.mockResolvedValue({ data: [file(retained)] });
    expect(await removeReturnedW119Attachments(requestId, [removed])).toEqual({
      removedIds: [removed],
      error: null,
      warning: null,
    });
    expect(mocks.deleted).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("refuses paths outside the request before any write", async () => {
    mocks.files.mockResolvedValue({
      data: [
        { ...file(removed), storage_path: `requests/${retained}/${removed}.pdf` },
        file(retained),
      ],
    });
    expect((await removeReturnedW119Attachments(requestId, [removed])).error).toContain(
      "ตำแหน่งไฟล์",
    );
    expect(mocks.deleted).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("deduplicates selection and rejects invalid input before authentication", async () => {
    expect((await removeReturnedW119Attachments("bad", [removed])).error).toBeTruthy();
    expect((await removeReturnedW119Attachments(requestId, ["../bad"])).error).toBeTruthy();
    expect(
      (await removeReturnedW119Attachments(requestId, Array(11).fill(removed))).error,
    ).toBeTruthy();
    expect(mocks.getUser).not.toHaveBeenCalled();
    await removeReturnedW119Attachments(requestId, [removed, removed]);
    expect(mocks.deleteIds).toHaveBeenCalledWith("id", [removed]);
  });
  it("has no mutation for an empty selection", async () => {
    expect(await removeReturnedW119Attachments(requestId, [])).toEqual({
      removedIds: [],
      error: null,
      warning: null,
    });
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("does not remove storage when metadata read/delete fails or RLS deletes zero rows", async () => {
    mocks.files.mockResolvedValueOnce({ data: null, error: {} });
    expect((await removeReturnedW119Attachments(requestId, [removed])).error).toBeTruthy();
    mocks.deleted.mockResolvedValueOnce({ data: null, error: {} });
    expect((await removeReturnedW119Attachments(requestId, [removed])).removedIds).toEqual([]);
    mocks.deleted.mockResolvedValueOnce({ data: [], error: null });
    expect((await removeReturnedW119Attachments(requestId, [removed])).error).toContain(
      "ลบเอกสารได้ไม่ครบ",
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("cleans only confirmed rows and reports partial deletion accurately", async () => {
    const replacement = "55555555-5555-4555-8555-555555555555";
    mocks.files.mockResolvedValue({ data: [file(removed), file(retained), file(replacement)] });
    expect(await removeReturnedW119Attachments(requestId, [removed, retained])).toMatchObject({
      removedIds: [removed],
      error: expect.any(String),
    });
    expect(mocks.remove).toHaveBeenCalledWith([file(removed).storage_path]);
  });
  it.each(["error", "throw"])(
    "reports storage %s without restoring broken links or claiming everything succeeded",
    async (mode) => {
      if (mode === "error")
        mocks.remove.mockResolvedValue({ error: { message: "storage outage" } });
      else mocks.remove.mockRejectedValue(new Error("network error"));
      const result = await removeReturnedW119Attachments(requestId, [removed]);
      expect(result).toMatchObject({
        removedIds: [removed],
        error: null,
        warning: expect.stringContaining("พื้นที่จัดเก็บ"),
      });
      expect(mocks.revalidate).toHaveBeenCalledWith("/requests/TEST-W119");
    },
  );
});
