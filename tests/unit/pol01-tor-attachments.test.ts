import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  read: vi.fn(),
  upload: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  deleted: vi.fn(),
}));
vi.mock("../../lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mocks.user },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    from: () => ({
      select: () => ({ eq: mocks.read }),
      upsert: mocks.upsert,
      delete: () => {
        const query = { eq: () => query, in: mocks.deleted };
        return query;
      },
    }),
  }),
}));
import { syncTorAttachments } from "../../app/requests/tor/attachments";
const requestId = "11111111-1111-4111-8111-111111111111";
const torId = "22222222-2222-4222-8222-222222222222";
const oldId = "33333333-3333-4333-8333-333333333333";
const file = { id: torId, file: new File(["pdf"], "TOR-office.pdf", { type: "application/pdf" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.read.mockResolvedValue({
    data: [
      {
        storage_path: `requests/${requestId}/manual.pdf`,
        file_name: "manual.pdf",
        size_bytes: 20,
        mime_type: "application/pdf",
      },
    ],
    error: null,
  });
  for (const fn of [mocks.upload, mocks.upsert, mocks.remove, mocks.deleted])
    fn.mockResolvedValue({ error: null });
});
describe("TOR PDF synchronization", () => {
  it("blocks uploads when retained file size is unknown without deleting originals", async () => {
    mocks.read.mockResolvedValue({
      data: [
        { storage_path: "manual.pdf", file_name: "manual.pdf", size_bytes: null, mime_type: null },
      ],
      error: null,
    });
    expect((await syncTorAttachments(requestId, [file])).error).toContain("ขนาดไฟล์แนบเดิม");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.deleted).not.toHaveBeenCalled();
  });
  it("infers a missing MIME from the retained filename without changing its metadata", async () => {
    mocks.read.mockResolvedValue({
      data: [
        { storage_path: "manual.pdf", file_name: "manual.pdf", size_bytes: 20, mime_type: null },
      ],
      error: null,
    });
    expect(await syncTorAttachments(requestId, [file])).toEqual({ error: null });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect((await syncTorAttachments(requestId, [file])).error).toBeTruthy();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("upserts same identity on retries without deleting any manual file", async () => {
    expect(await syncTorAttachments(requestId, [file])).toEqual({ error: null });
    expect(await syncTorAttachments(requestId, [file])).toEqual({ error: null });
    expect(
      mocks.upload.mock.calls.every((call) => call[0] === `requests/${requestId}/${torId}.pdf`),
    ).toBe(true);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not erase valid PDFs if a later upload fails", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("offline") });
    expect((await syncTorAttachments(requestId, [file], [oldId])).error).toBeTruthy();
    expect(mocks.deleted).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not erase old metadata on failed upsert", async () => {
    mocks.upsert.mockResolvedValue({ error: new Error("offline") });
    expect((await syncTorAttachments(requestId, [file], [oldId])).error).toBeTruthy();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("removes only explicitly removed TOR IDs after replacement succeeds", async () => {
    expect(await syncTorAttachments(requestId, [file], [oldId, torId])).toEqual({ error: null });
    expect(mocks.deleted).toHaveBeenCalledWith("storage_path", [
      `requests/${requestId}/${oldId}.pdf`,
    ]);
    expect(mocks.remove).toHaveBeenCalledWith([`requests/${requestId}/${oldId}.pdf`]);
    expect(mocks.deleted.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.upsert.mock.invocationCallOrder[0],
    );
  });
  it("validates combined attachment limit before upload", async () => {
    mocks.read.mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({
        storage_path: `manual-${i}`,
        file_name: `${i}.pdf`,
        size_bytes: 20,
        mime_type: "application/pdf",
      })),
      error: null,
    });
    expect((await syncTorAttachments(requestId, [file])).error).toContain("10");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("blocks malformed IDs instead of constructing arbitrary paths", async () => {
    expect((await syncTorAttachments(requestId, [file], ["../manual"])).error).toBeTruthy();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
