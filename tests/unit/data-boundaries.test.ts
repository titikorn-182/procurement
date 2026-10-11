import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)],
  );
}
describe("data access architecture boundaries", () => {
  it("keeps direct Supabase clients out of UI modules", () => {
    const violations = [...files("app"), ...files("features")]
      .filter((p) => p.endsWith(".tsx"))
      .filter((p) =>
        /from\s+["'][^"']*(?:supabase\/(?:server|client)|@supabase\/)/.test(
          readFileSync(p, "utf8"),
        ),
      );
    expect(violations).toEqual([]);
  });
  it("marks every feature server module as server-only or a Server Action", () => {
    const violations = files("features")
      .filter((p) => /[/\\]server[/\\]/.test(p))
      .filter(
        (p) => !/(?:import ["']server-only["']|["']use server["'])/.test(readFileSync(p, "utf8")),
      );
    expect(violations).toEqual([]);
  });
  it("keeps pure models, schemas and shared types independent of server clients and UI modules", () => {
    const violations = files("features")
      .filter((p) => !/[/\\]server[/\\]|[/\\]forms[/\\]|\.client\.ts$/.test(p))
      .filter((p) =>
        /from\s+["'][^"']*(?:supabase\/(?:server|client)|\/components\/|\/page|\/requests-client)/.test(
          readFileSync(p, "utf8"),
        ),
      );
    expect(violations).toEqual([]);
  });
  it("lets catalog administration use catalog-owned schemas", () => {
    expect(readFileSync("features/catalog/admin-schema.ts", "utf8")).not.toContain(
      "requests/new/catalog-schema",
    );
  });
  it("keeps form controllers on the client side of the data-access boundary", () => {
    const violations = files("features/requests/forms").filter((p) =>
      /from\s+["'][^"']*(?:supabase\/(?:server|client)|\/server\/|@supabase\/)/.test(
        readFileSync(p, "utf8"),
      ),
    );
    expect(violations).toEqual([]);
  });
  it("keeps submission and state ownership in hooks instead of the extracted screens", () => {
    const violations = files("features/requests/forms")
      .filter((p) => p.endsWith(".tsx"))
      .filter((p) =>
        /\b(?:useState|useTransition|createRequestDraft|updateReturnedRequest|uploadRequestAttachments)\b/.test(
          readFileSync(p, "utf8"),
        ),
      );
    expect(violations).toEqual([]);
  });
});
