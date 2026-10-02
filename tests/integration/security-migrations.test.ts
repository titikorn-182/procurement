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

  it("keeps requests in draft until private attachment objects are ready", () => {
    const sql = readMigration("202610020001_request_attachment_submission.sql");
    expect(sql).toContain("public.create_procurement_request_draft");
    expect(sql).toContain("public.submit_procurement_request_draft");
    expect(sql).toContain("current_request.status <> 'draft'");
    expect(sql).toContain("left join storage.objects");
    expect(sql).toContain("required attachment missing");

    const fixSql = readMigration("202610020002_fix_request_draft_creation.sql");
    expect(fixSql).toContain("item_total, 'draft', 1, null");
    expect(fixSql).not.toContain("set status = 'draft'");

    const transitionSql = readMigration("202610020003_allow_requester_draft_submission.sql");
    expect(transitionSql).toContain("old.status = 'draft'");
    expect(transitionSql).toContain("new.status = 'submitted'");
    expect(transitionSql).toContain("old.requester_id = (select auth.uid())");
    expect(transitionSql).toContain("select min(first_step.step_no)");

    const validationSql = readMigration("202610020004_validate_request_submission_attachments.sql");
    expect(validationSql).toContain("new.form_data->>'formType' = 'w119'");
    expect(validationSql).toContain("greatest(required_attachment_count, 1)");
    expect(validationSql).toContain("left join storage.objects");
    expect(validationSql).toContain("when (old.status = 'draft' and new.status = 'submitted')");
  });

  it("keeps request history readable only for actual workflow participants", () => {
    const sql = readMigration("202610020005_allow_request_participant_history.sql");

    expect(sql).toContain("workflow_actions_actor_request_idx");
    expect(sql).toContain("create or replace function private.can_read_request");
    expect(sql).toContain("a.actor_id = p.id");
    expect(sql).toContain("p.active = true");
    expect(sql).not.toContain("a.required_role = p.role");
    expect(sql).toContain(
      "grant execute on function private.can_read_request(uuid) to authenticated",
    );
  });
});
