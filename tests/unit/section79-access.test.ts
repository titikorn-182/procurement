import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  createClient: vi.fn(),
  getUser: vi.fn(),
  profile: vi.fn(),
  workspace: vi.fn(),
  from: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("../../lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/components/print/fonts", () => ({ sarabunPsk: { className: "test-psk" } }));
vi.mock("../../app/requests/section79/workspace", () => ({
  Section79Workspace: (props: unknown) => {
    mocks.workspace(props);
    return createElement("div", null, "Section79 editor");
  },
}));
import Section79Page from "../../app/requests/section79/page";

const render = async () => renderToStaticMarkup(await Section79Page());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.connection.mockResolvedValue(undefined);
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: mocks.from });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "user", active: true }, error: null });
  mocks.eq.mockImplementation(() => ({ maybeSingle: mocks.profile }));
  mocks.from.mockImplementation(() => ({ select: () => ({ eq: mocks.eq }) }));
});
afterEach(() => vi.useRealTimers());

describe("Section79 preparation-only page access", () => {
  it.each(["user", "admin"])("allows active %s, reads only that account profile", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, active: true }, error: null });
    expect(await render()).toContain("Section79 editor");
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.workspace).toHaveBeenCalledWith(
      expect.objectContaining({ fontClassName: "test-psk" }),
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.eq).toHaveBeenCalledWith("id", "test-user");
  });

  it.each([
    { role: "user", active: false },
    { role: "admin", active: false },
    { role: "admin" },
    { role: "procurement_staff", active: true },
    { role: "dean", active: true },
    { role: "executive", active: true },
    { role: "other", active: true },
    null,
  ])("denies %j without exposing the editor", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    expect(await render()).toContain("กรุณาตรวจสอบการเข้าสู่ระบบ");
    expect(mocks.workspace).not.toHaveBeenCalled();
  });

  it("denies unauthenticated requests without querying a profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await render()).not.toContain("Section79 editor");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("fails closed on authentication and profile errors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: {} });
    expect(await render()).not.toContain("Section79 editor");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: {} });
    expect(await render()).not.toContain("Section79 editor");
  });

  it.each(["createClient", "getUser", "profile"] as const)(
    "fails closed when %s throws",
    async (target) => {
      mocks[target].mockRejectedValue(new Error("service unavailable"));
      expect(await render()).toContain("กรุณาตรวจสอบการเข้าสู่ระบบ");
      expect(mocks.workspace).not.toHaveBeenCalled();
    },
  );

  it("does not swallow request-time rendering signals", async () => {
    mocks.connection.mockRejectedValue(new Error("request-time boundary"));
    await expect(render()).rejects.toThrow("request-time boundary");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each([
    ["2026-09-30T16:59:59Z", "2569"],
    ["2026-09-30T17:00:00Z", "2570"],
  ])("uses Bangkok fiscal year at %s", async (instant, expectedYear) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
    await render();
    expect(mocks.workspace).toHaveBeenCalledWith(
      expect.objectContaining({ fiscalYear: expectedYear }),
    );
  });
});
