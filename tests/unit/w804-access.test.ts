import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  workspace: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/components/print/fonts", () => ({ sarabunPsk: { className: "test-psk" } }));
vi.mock("../../app/requests/w804/workspace", () => ({
  W804Workspace: (props: unknown) => {
    mocks.workspace(props);
    return createElement("div", null, "W804 editor");
  },
}));
import W804Page from "../../app/requests/w804/page";
const render = async () =>
  renderToStaticMarkup(
    await W804Page({ searchParams: Promise.resolve({ document: "settlement" }) }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "user", active: true }, error: null });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
  }));
});

describe("W804 page access: preparation only", () => {
  it.each(["user", "admin"])("allows active %s and reads only its profile", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, active: true }, error: null });
    expect(await render()).toContain("W804 editor");
    expect(mocks.workspace).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "settlement", fontClassName: "test-psk" }),
    );
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
  });
  it.each([
    { role: "user", active: false },
    { role: "admin", active: false },
    { role: "admin" },
    { role: "procurement_staff", active: true },
    { role: "dean", active: true },
    null,
  ])("does not render the editor for %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    expect(await render()).toContain("กรุณาตรวจสอบการเข้าสู่ระบบ");
    expect(mocks.workspace).not.toHaveBeenCalled();
  });
  it("denies unauthenticated requests without fetching a profile", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await render()).not.toContain("W804 editor");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("fails closed on authentication or profile errors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: {} });
    expect(await render()).not.toContain("W804 editor");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: {} });
    expect(await render()).not.toContain("W804 editor");
  });
});
