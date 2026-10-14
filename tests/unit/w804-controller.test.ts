import { beforeEach, describe, expect, it, vi } from "vitest";
import { createW804Fixture } from "../fixtures/w804";
const harness = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, save: vi.fn() }));
// Exercises async callback ordering; browser QA covers actual React rendering.
vi.mock("react", () => ({
  useState<T>(initial: T) {
    const i = harness.cursor++;
    if (!(i in harness.slots)) harness.slots[i] = initial;
    return [
      harness.slots[i] as T,
      (value: T) => {
        harness.slots[i] = value;
      },
    ];
  },
  useRef<T>(initial: T) {
    const i = harness.cursor++;
    if (!(i in harness.slots)) harness.slots[i] = { current: initial };
    return harness.slots[i] as { current: T };
  },
}));
vi.mock("../../app/requests/w804/actions", () => ({ saveW804DraftAction: harness.save }));
import { useW804Registry } from "../../features/w804/use-w804-registry";
const record = { id: "11111111-1111-4111-8111-111111111111", requestNo: "W804-001", revision: 1 };
function renderHook<T, Args extends unknown[]>(hook: (...args: Args) => T, ...args: Args): T {
  harness.cursor = 0;
  return hook(...args);
}
beforeEach(() => {
  harness.slots = [];
  harness.cursor = 0;
  vi.resetAllMocks();
});
describe("W804 registry controller", () => {
  it("keeps one UUID when a response is lost and accepts the database identity", async () => {
    harness.save
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, record });
    const form = renderHook(useW804Registry);
    expect((await form.save(createW804Fixture())).ok).toBe(false);
    expect((await form.save(createW804Fixture())).ok).toBe(true);
    expect(harness.save.mock.calls[0][0].id).toBe(harness.save.mock.calls[1][0].id);
    expect(renderHook(useW804Registry).identity).toEqual(record);
  });
  it("ignores a second click while saving and unlocks on failure", async () => {
    let fail: (error: Error) => void = () => {};
    harness.save.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    );
    const form = renderHook(useW804Registry);
    const pending = form.save(createW804Fixture());
    expect(renderHook(useW804Registry).saving).toBe(true);
    expect((await form.save(createW804Fixture())).ok).toBe(false);
    expect(harness.save).toHaveBeenCalledTimes(1);
    fail(new Error("offline"));
    await pending;
    expect(renderHook(useW804Registry).saving).toBe(false);
  });
  it("updates with the latest returned revision, never allocates another identity", async () => {
    harness.save
      .mockResolvedValueOnce({ ok: true, record: { ...record, revision: 2 } })
      .mockResolvedValueOnce({ ok: true, record: { ...record, revision: 3 } });
    const form = renderHook(useW804Registry, record);
    await form.save(createW804Fixture());
    await form.save(createW804Fixture());
    expect(harness.save.mock.calls.map(([args]) => [args.id, args.revision])).toEqual([
      [record.id, 1],
      [record.id, 2],
    ]);
  });
  it("keeps the current identity after a conflict and resets only for an explicit new set", async () => {
    harness.save.mockResolvedValueOnce({ ok: false, error: "conflict" });
    const form = renderHook(useW804Registry, record);
    await form.save(createW804Fixture());
    expect(renderHook(useW804Registry).identity).toEqual(record);
    form.reset();
    expect(renderHook(useW804Registry).identity).toBeUndefined();
    harness.save.mockResolvedValueOnce({ ok: true, record: { ...record, requestNo: "W804-002" } });
    await form.save(createW804Fixture());
    expect(harness.save.mock.lastCall?.[0]).toMatchObject({ revision: 0 });
    expect(harness.save.mock.lastCall?.[0].id).not.toBe(record.id);
  });
});
