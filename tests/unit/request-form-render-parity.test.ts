import { createHash } from "node:crypto";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { standardEditFixture, w119EditFixture } from "../fixtures/request-edit";

// Capture every existing step before extraction, without submitting real requests.
const view = vi.hoisted(() => ({ step: 0 }));
vi.mock("../../lib/supabase/client", () => ({
  createClient: () => {
    throw new Error("No live database access during render tests");
  },
}));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => react.useState(initial === 0 ? view.step : initial),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/requests/new/actions", () => ({
  createRequestDraft: vi.fn(),
  submitRequestDraft: vi.fn(),
}));
vi.mock("../../app/requests/[id]/edit/actions", () => ({
  updateReturnedRequest: vi.fn(),
  resubmitReturnedRequest: vi.fn(),
}));
vi.mock("../../app/requests/[id]/edit/attachment-actions", () => ({
  removeReturnedW119Attachments: vi.fn(),
}));
vi.mock("../../app/lib/request-attachments.client", () => ({ uploadRequestAttachments: vi.fn() }));
vi.mock("../../app/requests/new/catalog-actions", () => ({ searchProcurementCatalog: vi.fn() }));
vi.mock("../../app/requests/new/vendor-picker", () => ({ VendorPicker: () => null }));

import NewRequestPage from "../../app/requests/new/page";
import { W119Form } from "../../app/requests/w119/w119-form";
import { ReturnedRequestEditor } from "../../app/requests/[id]/edit/returned-request-editor";

function fingerprint(node: ReactNode) {
  // Hash complete rendered markup, including classes, labels, values and disabled states.
  // Only React's tree-dependent generated IDs are normalized across component extraction.
  const html = renderToStaticMarkup(node).replace(/_R_[^"\s<>]*_/g, "REACT_ID");
  return createHash("sha256").update(html).digest("hex");
}

describe("request form extraction: original rendered markup", () => {
  it.each([0, 1, 2, 3, 4])("preserves POL01 step %s", (step) => {
    view.step = step;
    expect(fingerprint(createElement(NewRequestPage))).toMatchSnapshot();
  });
  it.each([0, 1, 2, 3, 4])("preserves new W119 step %s", (step) => {
    view.step = step;
    expect(fingerprint(createElement(W119Form, { printFontClassName: "psk" }))).toMatchSnapshot();
  });
  it.each([0, 1, 2, 3, 4])(
    "preserves returned W119 with loan and original attachment, step %s",
    (step) => {
      view.step = step;
      expect(
        fingerprint(
          createElement(W119Form, { printFontClassName: "psk", initial: w119EditFixture() }),
        ),
      ).toMatchSnapshot();
    },
  );
  it.each(["returned", "draft"] as const)("preserves the POL01 %s editor", (status) => {
    view.step = 0;
    expect(
      fingerprint(
        createElement(ReturnedRequestEditor, { initial: { ...standardEditFixture(), status } }),
      ),
    ).toMatchSnapshot();
  });
});
