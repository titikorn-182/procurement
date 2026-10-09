import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  departments: vi.fn(),
  settings: vi.fn(),
  workspace: vi.fn(),
}));

vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      select: () => {
        if (table === "profiles") return { eq: () => ({ maybeSingle: mocks.profile }) };
        if (table === "departments") return { order: mocks.departments };
        return mocks.settings();
      },
    }),
    rpc: mocks.rpc,
  }),
}));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/components/ui", () => ({
  PageHeader: ({ title }: { title: string }) => createElement("h1", null, title),
}));
vi.mock("../../app/settings/settings-workspace", () => ({
  SettingsWorkspace: (props: unknown) => {
    mocks.workspace(props);
    return createElement("div", null, "Admin settings workspace");
  },
}));

import SettingsPage from "../../app/settings/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-admin" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.departments.mockResolvedValue({ data: [], error: null });
  mocks.settings.mockResolvedValue({ data: [], error: null });
});

describe("settings administrator boundary", () => {
  it("renders the settings workspace for an active administrator", async () => {
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("Admin settings workspace");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_user_profiles");
  });

  it.each([
    { role: "user", active: true },
    { role: "procurement_staff", active: true },
    { role: "admin", active: false },
    { role: "admin" },
    null,
  ])("does not expose settings or fetch the directory for %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    const html = renderToStaticMarkup(await SettingsPage());
    expect(html).toContain("ไม่มีสิทธิ์แก้ไขการตั้งค่า");
    expect(mocks.workspace).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
  });

  it("fails closed when the authentication result includes an error", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-admin" } }, error: {} });
    expect(renderToStaticMarkup(await SettingsPage())).toContain("ไม่มีสิทธิ์");
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when reading an administrator profile fails", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: {} });
    expect(renderToStaticMarkup(await SettingsPage())).toContain("ไม่มีสิทธิ์");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("still renders independent directory management if system_settings is unavailable", async () => {
    mocks.settings.mockResolvedValue({ data: null, error: {} });
    renderToStaticMarkup(await SettingsPage());
    expect(mocks.workspace).toHaveBeenCalledWith(expect.objectContaining({ databaseReady: false }));
  });
});
