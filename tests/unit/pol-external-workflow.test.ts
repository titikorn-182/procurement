import { beforeEach, describe, expect, it, vi } from "vitest";
import { externalFixture } from "../fixtures/pol-external";
import { externalInput } from "../../app/requests/pol-external/model";
import { parseRequestFormData } from "../../app/requests/new/schemas";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  select: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: () => {
      const query = { select: mocks.select, eq: mocks.eq, in: mocks.in, maybeSingle: mocks.single };
      mocks.select.mockReturnValue(query);
      mocks.eq.mockReturnValue(query);
      mocks.in.mockReturnValue(query);
      return query;
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../lib/server/action-errors", () => ({
  toSafeActionError: () => "เกิดข้อผิดพลาด กรุณาลองใหม่",
}));
vi.mock("../../app/lib/vendor-directory.server", () => ({
  findLocalVendorById: vi.fn(),
  normalizeVendorSearchTerm: vi.fn(),
  searchLocalVendors: vi.fn(),
}));
import { createRequestDraft, submitRequestDraft } from "../../app/requests/new/actions";
import {
  updateReturnedRequest,
  resubmitReturnedRequest,
} from "../../app/requests/[id]/edit/actions";
import { getReturnedRequestForEdit } from "../../app/lib/live-data";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  const input = externalInput(externalFixture());
  const parsed = parseRequestFormData(input.formData);
  mocks.single.mockResolvedValue({
    data: {
      id,
      request_no: "POL01-TEST",
      form_data: parsed.success ? parsed.data : {},
      request_items: input.items,
      status: "returned",
      request_attachments: [],
      workflow_actions: [],
    },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: [{ id, request_no: "POL01-TEST" }], error: null });
});
describe("POL external shares POL01 workflow and ownership", () => {
  it("creates through the existing draft RPC with metadata and no W119 price requirements", async () => {
    expect((await createRequestDraft(externalInput(externalFixture()))).error).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_procurement_request_draft",
      expect.objectContaining({
        request_form_data: expect.objectContaining({
          formType: "standard",
          externalPol01: expect.objectContaining({ phone: "3944" }),
        }),
      }),
    );
  });
  it("submits and resubmits through the existing protected RPCs", async () => {
    await submitRequestDraft(id);
    await resubmitReturnedRequest(id);
    expect(mocks.rpc).toHaveBeenCalledWith("submit_procurement_request_draft", {
      target_request_id: id,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("resubmit_returned_procurement_request", {
      target_request_id: id,
    });
  });
  it("updates returned data in place and checks owner/status", async () => {
    expect((await updateReturnedRequest(id, externalInput(externalFixture()))).error).toBeNull();
    expect(mocks.eq).toHaveBeenCalledWith("requester_id", "owner");
    expect(mocks.in).toHaveBeenCalledWith("status", ["returned", "draft"]);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_returned_procurement_request",
      expect.objectContaining({
        target_request_id: id,
        request_form_data: expect.objectContaining({
          externalPol01: expect.objectContaining({
            itemNotes: [{ lineNo: 1, note: "รวมค่าเดินทางและอุปกรณ์แล้ว" }],
          }),
        }),
      }),
    );
  });
  it("loads external metadata for the correct returned editor", async () => {
    expect((await getReturnedRequestForEdit("POL01-TEST")).data).toMatchObject({
      formType: "standard",
      externalPol01: { phone: "3944" },
    });
  });
  it("refuses corrupted saved metadata", async () => {
    mocks.single.mockResolvedValue({
      data: { form_data: { formType: "standard", externalPol01: {} } },
    });
    expect((await getReturnedRequestForEdit("POL01-TEST")).data).toBeNull();
  });
  it("does not allow silently dropping the external template on edit", async () => {
    const input = externalInput(externalFixture());
    delete (input.formData as Record<string, unknown>).externalPol01;
    expect((await updateReturnedRequest(id, input)).error).toContain("ไม่สามารถเปลี่ยน");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not convert a standard template to an external one on edit", async () => {
    mocks.single.mockResolvedValue({ data: { form_data: { formType: "standard" } } });
    expect((await updateReturnedRequest(id, externalInput(externalFixture()))).error).toContain(
      "ไม่สามารถเปลี่ยน",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("refuses inconsistent methods and numeric overflow before any RPC", async () => {
    const input = externalInput(externalFixture());
    input.kind = "purchase";
    expect((await createRequestDraft(input)).error).not.toBeNull();
    input.kind = "hire";
    input.items[0].unit_price = 999_999_999_999.99;
    expect((await updateReturnedRequest(id, input)).error).not.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not create or update without an authenticated owner", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await createRequestDraft(externalInput(externalFixture()))).error).toContain(
      "เข้าสู่ระบบ",
    );
    expect((await updateReturnedRequest(id, externalInput(externalFixture()))).error).toContain(
      "เข้าสู่ระบบ",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
