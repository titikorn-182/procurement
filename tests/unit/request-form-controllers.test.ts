import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { standardEditFixture, w119EditFixture } from "../fixtures/request-edit";
import type { SelectedAttachment } from "../../app/lib/request-attachments";

// Deterministic hook-state harness: exercises controller callbacks and async ordering,
// not React scheduling, DOM events, or browser end-to-end behavior.
const state = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  tasks: [] as Promise<unknown>[],
}));
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
  resubmit: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  tor: vi.fn(),
  syncTor: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("react", () => ({
  useState<T>(initial: T | (() => T)) {
    const index = state.cursor++;
    if (!(index in state.slots))
      state.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    return [
      state.slots[index] as T,
      (next: T | ((current: T) => T)) => {
        state.slots[index] =
          typeof next === "function" ? (next as (current: T) => T)(state.slots[index] as T) : next;
      },
    ];
  },
  useMemo<T>(factory: () => T) {
    return factory();
  },
  useRef<T>(value: T) {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: value };
    return state.slots[index];
  },
  useTransition: () => [
    false,
    (action: () => unknown) => {
      state.tasks.push(Promise.resolve(action()));
    },
  ],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("../../app/requests/new/actions", () => ({
  createRequestDraft: mocks.create,
  submitRequestDraft: mocks.submit,
}));
vi.mock("../../app/requests/[id]/edit/actions", () => ({
  updateReturnedRequest: mocks.update,
  resubmitReturnedRequest: mocks.resubmit,
}));
vi.mock("../../app/requests/[id]/edit/attachment-actions", () => ({
  removeReturnedW119Attachments: mocks.remove,
}));
vi.mock("../../app/lib/request-attachments.client", () => ({
  uploadRequestAttachments: mocks.upload,
}));
vi.mock("../../app/requests/tor/pdf", () => ({ createTorAttachments: mocks.tor }));
vi.mock("../../app/requests/tor/attachments", () => ({ syncTorAttachments: mocks.syncTor }));

import { usePol01Form } from "../../features/requests/forms/pol01/use-pol01-form";
import { useW119Form } from "../../features/requests/forms/w119/use-w119-form";
import { useReturnedRequestForm } from "../../features/requests/forms/returned/use-returned-request-form";

function renderHook<T, Args extends unknown[]>(hook: (...args: Args) => T, ...args: Args): T {
  state.cursor = 0;
  return hook(...args);
}
async function settle() {
  await Promise.all(state.tasks.splice(0));
}
function attachment(id = "file"): SelectedAttachment {
  return { id, file: new File(["test"], `${id}.pdf`, { type: "application/pdf" }) };
}
beforeEach(() => {
  state.slots = [];
  state.cursor = 0;
  state.tasks = [];
  vi.resetAllMocks();
  vi.stubGlobal("window", { scrollTo: vi.fn() });
  mocks.create.mockResolvedValue({ error: null, requestId: "draft-id", requestNo: "TEST-DRAFT" });
  mocks.submit.mockResolvedValue({ error: null, requestNo: "TEST-SENT" });
  mocks.update.mockResolvedValue({ error: null });
  mocks.resubmit.mockResolvedValue({ error: null, requestNo: "TEST-RESENT" });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null, removedIds: [], warning: null });
  mocks.tor.mockResolvedValue([]);
  mocks.syncTor.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllGlobals());

describe("POL01 form controller", () => {
  function fill() {
    const form = renderHook(usePol01Form);
    form.setTitle("ทดสอบ");
    form.setRationale("เหตุผล");
    form.setRequiredDate("2099-10-20");
    form.setLoanRequirement("reimburse_after_purchase");
    form.setItems([
      {
        description: "วัสดุ",
        quantity: 2,
        unit: "ชุด",
        unitPrice: 100,
        marketPrice: 120,
        priceSource: "ใบเสนอราคา",
      },
    ]);
    return renderHook(usePol01Form);
  }
  it("keeps blank examples out of totals and blocks incomplete steps", () => {
    const form = renderHook(usePol01Form);
    expect(form.total).toBe(0);
    form.goNext();
    expect(renderHook(usePol01Form)).toMatchObject({
      step: 0,
      error: expect.stringContaining("กรุณากรอก"),
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("preserves typed fields and totals when navigating backward and forward", () => {
    const form = fill();
    form.goNext();
    let current = renderHook(usePol01Form);
    expect(current.step).toBe(1);
    expect(current.total).toBe(200);
    current.updateItem(0, { quantity: 3 });
    current.setStep(0);
    current = renderHook(usePol01Form);
    expect(current.title).toBe("ทดสอบ");
    expect(current.total).toBe(300);
    expect(current.items[0].marketPrice).toBe(120);
  });
  it("requires the new-vendor name before leaving the budget step", () => {
    const form = fill();
    form.setStep(2);
    form.setVendorSelection({ kind: "new" });
    renderHook(usePol01Form).goNext();
    expect(renderHook(usePol01Form).error).toContain("ชื่อผู้ประกอบการ");
  });
  it("stops before draft creation if TOR generation fails", async () => {
    mocks.tor.mockRejectedValue(new Error("TOR failed"));
    fill().handleSubmit();
    await settle();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(renderHook(usePol01Form).error).toBe("TOR failed");
  });
  it("uploads the generated TOR together with manual files before submitting", async () => {
    const manual = attachment("manual");
    const tor = attachment("tor");
    mocks.tor.mockResolvedValue([tor]);
    fill().setAttachments([manual]);
    renderHook(usePol01Form).handleSubmit();
    await settle();
    expect(mocks.upload).toHaveBeenCalledWith("draft-id", [manual, tor], expect.any(Function));
    expect(mocks.submit).toHaveBeenCalledWith("draft-id");
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.submit.mock.invocationCallOrder[0],
    );
    expect(mocks.push).toHaveBeenCalledWith("/requests/TEST-SENT");
  });
  it("retains the draft ID and retries upload without creating another request", async () => {
    mocks.upload.mockResolvedValueOnce({ error: "upload failed" });
    fill().handleSubmit();
    await settle();
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(renderHook(usePol01Form).draft?.id).toBe("draft-id");
    renderHook(usePol01Form).handleSubmit();
    await settle();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });
  it("does not navigate on server submission rejection", async () => {
    mocks.submit.mockResolvedValue({ error: "rejected", requestNo: null });
    fill().handleSubmit();
    await settle();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(renderHook(usePol01Form).error).toBe("rejected");
  });
});

describe("W119 form controller", () => {
  it("restores historical saved values instead of replacing them with new-form defaults", () => {
    const initial = {
      ...w119EditFixture(),
      budgetYear: 2568,
      fundSource: "แหล่งเงินเดิม",
      expenseCategory: "ค่าครุภัณฑ์",
    };
    const form = renderHook(useW119Form, initial);
    expect(form.fiscalYear).toBe("2568");
    expect(form.fundSource).toBe("แหล่งเงินเดิม");
    expect(form.expenseCategory).toBe("ค่าครุภัณฑ์");
    expect(form.sourceCode).toBe("02");
  });
  it("preserves saved data and original files when opening and closing preview", () => {
    const initial = w119EditFixture();
    const form = renderHook(useW119Form, initial);
    form.openPreview();
    let current = renderHook(useW119Form, initial);
    expect(current.previewData).not.toBeNull();
    current.setPreviewData(null);
    current = renderHook(useW119Form, initial);
    expect(current.title).toBe(initial.title);
    expect(current.loanAgreement).toEqual(initial.formData.loanAgreement);
    expect(current.retainedAttachments).toEqual(initial.attachments);
  });
  it("can undo a pending removal without touching storage", () => {
    const initial = w119EditFixture();
    renderHook(useW119Form, initial).setPendingRemovalIds(["original"]);
    expect(renderHook(useW119Form, initial).attachmentCount).toBe(0);
    renderHook(useW119Form, initial).setPendingRemovalIds([]);
    expect(renderHook(useW119Form, initial).attachmentCount).toBe(1);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not delete originals when uploading their replacements fails", async () => {
    const initial = w119EditFixture();
    const form = renderHook(useW119Form, initial);
    form.setPendingRemovalIds(["original"]);
    form.setAttachments([attachment()]);
    mocks.upload.mockResolvedValue({ error: "upload failed" });
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(mocks.update).toHaveBeenCalledWith(initial.id, expect.any(Object));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.resubmit).not.toHaveBeenCalled();
  });
  it("preserves original ID and performs update → upload → removal → resubmit", async () => {
    const initial = w119EditFixture();
    const form = renderHook(useW119Form, initial);
    form.setAttachments([attachment()]);
    form.setPendingRemovalIds(["original"]);
    mocks.remove.mockResolvedValue({ error: null, warning: null, removedIds: ["original"] });
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    const calls = [mocks.update, mocks.upload, mocks.remove, mocks.resubmit].map(
      (fn) => fn.mock.invocationCallOrder[0],
    );
    expect(calls).toEqual([...calls].sort((a, b) => a - b));
    expect(mocks.remove).toHaveBeenCalledWith(initial.id, ["original"]);
    expect(mocks.resubmit).toHaveBeenCalledWith(initial.id);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(renderHook(useW119Form, initial).pendingRemovalIds).toEqual([]);
  });
  it("retains confirmed removals if resubmission fails and does not delete twice", async () => {
    const initial = w119EditFixture();
    const form = renderHook(useW119Form, initial);
    form.setAttachments([attachment()]);
    form.setPendingRemovalIds(["original"]);
    mocks.remove.mockResolvedValue({ error: null, warning: null, removedIds: ["original"] });
    mocks.resubmit.mockResolvedValueOnce({ error: "rejected" });
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(mocks.push).not.toHaveBeenCalled();
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.resubmit).toHaveBeenCalledTimes(2);
  });
  it("rejects double clicks while submission is in flight, then releases the lock", async () => {
    const initial = w119EditFixture();
    const form = renderHook(useW119Form, initial);
    form.handleSubmit();
    form.handleSubmit();
    await settle();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });
  it("keeps user data and releases the lock after a network exception", async () => {
    const initial = w119EditFixture();
    mocks.update.mockRejectedValueOnce(new Error("network down"));
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(renderHook(useW119Form, initial).error).toContain("การเชื่อมต่อขัดข้อง");
    expect(renderHook(useW119Form, initial).title).toBe(initial.title);
    renderHook(useW119Form, initial).handleSubmit();
    await settle();
    expect(mocks.resubmit).toHaveBeenCalledTimes(1);
  });
});

describe("returned POL01 form controller", () => {
  it("preserves leading zeroes, reference prices, attachment identity and original request ID", async () => {
    const initial = standardEditFixture();
    renderHook(useReturnedRequestForm, initial).handleResubmit();
    await settle();
    expect(mocks.update).toHaveBeenCalledWith(
      initial.id,
      expect.objectContaining({
        formData: expect.objectContaining({
          budgetCodes: {
            sourceCode: "02",
            departmentCode: "02301",
            fundCode: "02",
            activityCode: "00100",
          },
        }),
        items: [expect.objectContaining({ market_price: 120, price_source: "ใบเสนอราคา" })],
      }),
    );
    expect(mocks.upload).toHaveBeenCalledWith(initial.id, [], expect.any(Function), {
      preserveExisting: true,
    });
    expect(mocks.resubmit).toHaveBeenCalledWith(initial.id);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(["update", "upload", "syncTor"] as const)(
    "stops resubmission if %s fails",
    async (stage) => {
      mocks[stage].mockResolvedValueOnce({ error: `${stage} failed` });
      const initial = standardEditFixture();
      renderHook(useReturnedRequestForm, initial).handleResubmit();
      await settle();
      expect(mocks.resubmit).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
      expect(renderHook(useReturnedRequestForm, initial).error).toBe(`${stage} failed`);
    },
  );
});
