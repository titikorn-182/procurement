import { beforeEach, describe, expect, it, vi } from "vitest";
import { pol01ItemsPayload } from "../../app/requests/new/item-input";
import type { NewRequestInput } from "../../app/requests/new/schemas";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.user },
    rpc: mocks.rpc,
    from: () => {
      const query = {
        select: mocks.select,
        eq: mocks.eq,
        order: mocks.order,
        maybeSingle: mocks.single,
      };
      mocks.select.mockReturnValue(query);
      mocks.eq.mockReturnValue(query);
      mocks.order.mockReturnValue(query);
      return query;
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: () => "error" }));
vi.mock("../../app/lib/vendor-directory.server", () => ({
  findLocalVendorById: vi.fn(),
  normalizeVendorSearchTerm: vi.fn(),
  searchLocalVendors: vi.fn(),
}));
import { createRequestDraft } from "../../app/requests/new/actions";
import { updateReturnedRequest } from "../../app/requests/[id]/edit/actions";
import { getReturnedRequestForEdit, getRequestDetail } from "../../app/lib/live-data";

const id = "11111111-1111-4111-8111-111111111111";
const input: NewRequestInput = {
  kind: "purchase",
  title: "คำขอทดสอบ",
  rationale: "เหตุผลทดสอบ",
  requiredDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  budgetYear: 2570,
  fundSource: "เงินรายได้",
  planName: "แผนงานทดสอบ",
  expenseCategory: "ค่าวัสดุ",
  formData: {
    advanceFundingOption: "reimburse_after_purchase",
    vendor: null,
    budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "100210230004" },
  },
  items: [
    {
      line_no: 1,
      description: "รายการทดสอบ",
      quantity: 2,
      unit: "ชุด",
      unit_price: 125,
      market_price: 130,
      price_source: "ใบเสนอราคาเลขที่ QA-01",
    },
  ],
};
const stored = {
  id,
  request_no: "TEST-POL01",
  requester_id: "owner",
  status: "returned",
  current_step: 2,
  kind: input.kind,
  title: input.title,
  rationale: input.rationale,
  required_date: input.requiredDate,
  budget_year: 2570,
  fund_source: input.fundSource,
  plan_name: input.planName,
  expense_category: input.expenseCategory,
  form_data: { ...(input.formData as object), formType: "standard" },
  request_items: input.items,
  request_attachments: [],
  workflow_actions: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.single.mockResolvedValue({ data: structuredClone(stored), error: null });
  mocks.rpc.mockResolvedValue({ data: [{ id, request_no: "TEST-POL01" }], error: null });
});
describe("POL01 reference price persistence", () => {
  it("sends reference fields through the existing draft RPC", async () => {
    expect((await createRequestDraft(input)).error).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_procurement_request_draft",
      expect.objectContaining({ request_items: input.items }),
    );
  });
  it("loads the reference data and preserves it when editing and resubmitting", async () => {
    const result = await getReturnedRequestForEdit("TEST-POL01");
    expect(result.data?.items[0]).toMatchObject({
      marketPrice: 130,
      priceSource: "ใบเสนอราคาเลขที่ QA-01",
    });
    const items = pol01ItemsPayload(
      result.data!.items.map((item) => ({
        ...item,
        marketPrice: item.marketPrice ?? null,
        priceSource: item.priceSource ?? "",
      })),
    )!;
    expect((await updateReturnedRequest(id, { ...input, items })).error).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "update_returned_procurement_request",
      expect.objectContaining({ request_items: input.items }),
    );
  });
  it("reads reference fields for the request detail page", async () => {
    await getRequestDetail("TEST-POL01");
    expect(mocks.select).toHaveBeenCalledWith(
      expect.stringContaining("market_price, price_source"),
    );
  });
  it("does not fabricate reference data in older requests", async () => {
    mocks.single.mockResolvedValue({
      data: {
        ...stored,
        request_items: [{ ...input.items[0], market_price: null, price_source: null }],
      },
    });
    const result = await getReturnedRequestForEdit("TEST-POL01");
    expect(result.data?.items[0]).toMatchObject({ marketPrice: null, priceSource: "" });
  });
  it("still saves requests without the optional reference data", async () => {
    const { market_price: _price, price_source: _source, ...legacy } = input.items[0];
    void _price;
    void _source;
    expect((await createRequestDraft({ ...input, items: [legacy] })).error).toBeNull();
  });
});
