import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  form: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
}));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/components/print/fonts", () => ({ sarabunPsk: { className: "test-psk" } }));
vi.mock("../../app/requests/pol-external/form", () => ({
  ExternalForm: (props: unknown) => {
    mocks.form(props);
    return createElement("div", null, "external editor");
  },
}));
import ExternalPage from "../../app/requests/pol-external/page";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "user", active: true }, error: null });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
  }));
});
describe("external page access", () => {
  it.each(["admin", "user"])("allows active %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, active: true } });
    expect(renderToStaticMarkup(await ExternalPage())).toContain("external editor");
    expect(mocks.form).toHaveBeenCalledWith(expect.objectContaining({ fontClassName: "test-psk" }));
  });
  it.each([
    { role: "user", active: false },
    { role: "staff", active: true },
    { role: "dean", active: true },
    null,
  ])("fails closed for %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile });
    expect(renderToStaticMarkup(await ExternalPage())).not.toContain("external editor");
    expect(mocks.form).not.toHaveBeenCalled();
  });
  it("denies unauthenticated sessions and profile errors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect(renderToStaticMarkup(await ExternalPage())).not.toContain("external editor");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } } });
    mocks.profile.mockResolvedValue({
      data: { role: "admin", active: true },
      error: { message: "offline" },
    });
    expect(renderToStaticMarkup(await ExternalPage())).not.toContain("external editor");
  });
});
