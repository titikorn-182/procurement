import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(name: string) {
  return readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

describe("security hardening migrations", () => {
  it("only removes the POL01 loan requirement from submission and resubmission checks", () => {
    const sql = readMigration("202610080001_pol01_optional_loan_agreement.sql");
    const functions = [
      {
        name: "submit_procurement_request_draft",
        migration: "202610020001_request_attachment_submission.sql",
        record: "current_request",
      },
      {
        name: "validate_request_submission_attachments",
        migration: "202610020004_validate_request_submission_attachments.sql",
        record: "new",
      },
    ];

    for (const { name, migration, record } of functions) {
      const pattern = new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`);
      const original = readMigration(migration).match(pattern)?.[0];
      const updated = sql.match(pattern)?.[0];
      expect(original).toBeDefined();
      expect(updated).toBeDefined();
      expect(updated).toBe(
        original?.replace(
          `if coalesce((${record}.form_data->>'requiresLoanAgreement')::boolean, false) then`,
          `if (${record}.form_data->>'formType') is distinct from 'standard'\n` +
            `    and coalesce((${record}.form_data->>'requiresLoanAgreement')::boolean, false) then`,
        ),
      );
    }

    expect(sql).toContain(
      "revoke all on function public.submit_procurement_request_draft(uuid) from public",
    );
    expect(sql).toContain(
      "grant execute on function public.submit_procurement_request_draft(uuid) to authenticated",
    );
    expect(sql).not.toMatch(/delete from|drop trigger|disable row level security/i);
  });

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

  it("keeps vendor search bounded while tolerating small Thai spelling differences", () => {
    const sql = readMigration("202610050001_vendor_search_resilience.sql");

    expect(sql).toContain("profiles.active = true");
    expect(sql).toContain("least(coalesce(max_results, 20), 20)");
    expect(sql).toContain("extensions.word_similarity(normalized_query, v.search_name) >= 0.40");
    expect(sql).toContain("revoke all on function public.search_vendors");
    expect(sql).toContain("grant execute on function public.search_vendors");
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

  it("allows only the owner to edit and resubmit a returned request", () => {
    const sql = readMigration("202610020006_resubmit_returned_request.sql");

    expect(sql).toContain("public.update_returned_procurement_request");
    expect(sql).toContain("public.resubmit_returned_procurement_request");
    expect(sql).toContain("current_request.requester_id <> current_profile.id");
    expect(sql).toContain("current_request.status <> 'returned'");
    expect(sql).toContain("set status = 'pending'");
    expect(sql).toContain("'แก้ไขและส่งคำขอเข้าสู่กระบวนการใหม่'");
    expect(sql).toContain("old.status in ('draft', 'returned')");
    expect(sql).toContain("grant execute on function public.resubmit_returned_procurement_request");
  });

  it("creates POL02 drafts before private attachments and workflow submission", () => {
    const sql = readMigration("202610020007_pol02_payment_form.sql");

    expect(sql).toContain("public.payment_items");
    expect(sql).toContain("public.create_payment_request_draft");
    expect(sql).toContain("public.submit_payment_request_draft");
    expect(sql).toContain("current_payment.status <> 'draft'");
    expect(sql).toContain("join storage.objects");
    expect(sql).toContain("POL02 attachment is required");
    expect(sql).toContain("for update");
    expect(sql).toContain("is_owner_draft_submission");
    expect(sql).toContain("private.payment_workflow_steps");
  });

  it("assigns stable sequential POL01 numbers without changing UUID relationships", () => {
    const sql = readMigration("202610050002_pol01_request_numbering.sql");

    expect(sql).toContain("public.pol01_request_no_seq");
    expect(sql).toContain("private.next_pol01_request_no");
    expect(sql).toContain("'POL01-' || lpad(next_value::text, 3, '0')");
    expect(sql).toContain("order by created_at, id");
    expect(sql).toContain("alter column request_no set default private.next_pol01_request_no()");
  });

  it("exposes user directory contact details only through an admin RPC", () => {
    const sql = readMigration("202610050003_admin_user_directory.sql");

    expect(sql).toContain("public.admin_list_user_profiles");
    expect(sql).toContain("if not private.is_admin()");
    expect(sql).toContain("join auth.users");
    expect(sql).toContain("revoke all on function public.admin_list_user_profiles() from public");
    expect(sql).toContain(
      "grant execute on function public.admin_list_user_profiles() to authenticated",
    );
  });

  it("updates user identity and access settings atomically through an admin RPC", () => {
    const sql = readMigration("202610050004_admin_update_user_profile.sql");

    expect(sql).toContain("public.update_user_admin_settings");
    expect(sql).toContain("if not private.is_admin()");
    expect(sql).toContain("char_length(btrim(new_full_name)) not between 2 and 200");
    expect(sql).toContain("full_name = btrim(new_full_name)");
    expect(sql).toContain("position_title = nullif(btrim(new_position_title), '')");
    expect(sql).toContain("grant execute on function public.update_user_admin_settings");
  });
});
