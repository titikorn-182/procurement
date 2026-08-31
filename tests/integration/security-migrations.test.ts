import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(name: string) {
  return readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");
}

describe("security hardening migrations", () => {
  it("removes direct writes to workflow-controlled tables", () => {
    const sql = readMigration("202608300001_authorization_hardening.sql");
    expect(sql).toContain(
      "revoke insert, update, delete on public.procurement_requests from authenticated",
    );
    expect(sql).toContain(
      "revoke insert, update, delete on public.workflow_actions from authenticated",
    );
    expect(sql).toContain("private.can_mutate_document_path(name)");
  });

  it("drops the legacy request RPC and defines an authorized state machine", () => {
    const sql = readMigration("202608300002_procurement_workflow_hardening.sql");
    expect(sql).toContain("drop function if exists public.submit_procurement_request");
    expect(sql).toContain("public.transition_procurement_request");
    expect(sql).toContain("for update");
  });

  it("locks payment calculation and enforces idempotency", () => {
    const sql = readMigration("202608300003_payment_workflow_hardening.sql");
    expect(sql).toContain("payment_idempotency_key uuid");
    expect(sql).toContain("for update");
    expect(sql).toContain("payment_requests_requester_idempotency_idx");
    expect(sql).toContain("public.transition_payment_request");
  });

  it("exposes the vendor directory only through bounded RPCs", () => {
    const sql = readMigration("202608300004_vendor_access_hardening.sql");
    expect(sql).toContain("revoke all on table public.vendors from authenticated");
    expect(sql).toContain("least(coalesce(max_results, 20), 20)");
    expect(sql).toContain("public.resolve_vendor");
  });
});
