// Uses the pinned development dependency; optional override is documented in tests/sql/README.md.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
process.on("uncaughtException", (error) => {
  console.error(error.message, error.code, error.where, error.internalQuery);
  process.exit(1);
});
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb default '{}');
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema auth,storage to authenticated;
grant all on all tables in schema storage to authenticated;
`);
const migrations = [
  "202608030001_initial_procurement.sql",
  "202608030002_storage_and_role_admin.sql",
  "202608090004_w119_request_form.sql",
  "202608300001_authorization_hardening.sql",
  "202608300003_payment_workflow_hardening.sql",
  "202610020007_pol02_payment_form.sql",
  "202610110003_payment_revision_flow.sql",
  "202610110004_resume_procurement_drafts.sql",
];
for (const file of migrations) {
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  console.log("applied", file);
}
const owner = "11111111-1111-4111-8111-111111111111",
  staff = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333";
await db.exec(`insert into auth.users(id,email) values ('${owner}','owner@test.invalid'),('${staff}','staff@test.invalid'),('${other}','other@test.invalid');
insert into public.profiles(id,full_name,role) values ('${owner}','Synthetic owner','user'),('${staff}','Synthetic reviewer','procurement_staff'),('${other}','Other owner','user') on conflict(id) do update set role=excluded.role;
insert into public.departments(code,name_th) values ('QA','Synthetic department');
insert into public.procurement_requests(requester_id,department_id,kind,title,rationale,required_date,budget_year,fund_source,estimated_amount,status) values ('${owner}',(select id from public.departments where code='QA'),'purchase','Synthetic request','Testing only',current_date,2570,'income',1000,'approved');`);
const source = (await db.query("select id from public.procurement_requests")).rows[0].id;
const form = {
  formType: "pol02",
  formVersion: 1,
  approvalDate: "2026-01-01",
  departmentName: "Synthetic department",
  requesterName: "Synthetic owner",
  subject: "Synthetic payment",
  projectActivity: "",
  fundSource: "income",
  budgetYear: 2570,
  departmentCode: "",
  fundCode: "",
  activityCode: "",
  expenseCategory: "",
  procurementMethod: "test",
  egpProjectNo: "",
  contractNo: "",
  contractDate: "",
  vendorName: "Synthetic vendor",
  vendorTaxId: "",
  contractAmount: 1000,
  installmentNumber: 1,
  installmentCount: 1,
  documentChecklist: ["delivery_invoice"],
};
const items = [
  {
    lineNo: 1,
    description: "Synthetic item",
    attachmentType: "invoice",
    documentNo: "QA",
    quantity: 2,
    unitPrice: 100,
  },
];
async function login(id) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
await login(owner);
const args = [
  source,
  owner,
  "QA-1",
  "2026-01-01",
  200,
  0,
  "Test delivery",
  JSON.stringify(form),
  JSON.stringify(items),
];
const payment = (
  await db.query(
    "select * from public.create_payment_request_draft($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    args,
  )
).rows[0];
const file = "44444444-4444-4444-8444-444444444444";
await db.exec(
  `reset role; insert into storage.objects(bucket_id,name) values ('procurement-documents','payments/${payment.id}/${file}.pdf'); insert into public.payment_attachments(id,payment_request_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values ('${file}','${payment.id}','payments/${payment.id}/${file}.pdf','synthetic.pdf','application/pdf',100,'${owner}');`,
);
await login(owner);
await db.query("select * from public.submit_payment_request_draft($1)", [payment.id]);
await login(other);
assert.equal((await db.query("select * from public.payment_requests")).rows.length, 0);
await assert.rejects(
  db.query("select * from public.transition_payment_request($1,'approve',null)", [payment.id]),
  /permission/,
);
await login(staff);
await assert.rejects(
  db.query("select * from public.transition_payment_request($1,'return',null)", [payment.id]),
  /reason/,
);
await db.query("select * from public.transition_payment_request($1,'approve',null)", [payment.id]);
await db.query("select * from public.transition_payment_request($1,'return','Correct details')", [
  payment.id,
]);
await login(owner);
let stored = (await db.query("select * from public.payment_requests where id=$1", [payment.id]))
  .rows[0];
assert.equal(stored.current_step, 3);
assert.equal(stored.status, "returned");
const revisionArgs = [payment.id, stored.updated_at, [], ...args];
const revised = (
  await db.query(
    "select * from public.save_payment_request_revision($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
    revisionArgs,
  )
).rows[0];
await assert.rejects(
  db.query(
    "select * from public.save_payment_request_revision($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
    revisionArgs,
  ),
  /conflict/,
);
assert.equal((await db.query("select * from public.payment_revisions")).rows.length, 1);
await db.query("select * from public.submit_payment_request_draft($1)", [payment.id]);
stored = (await db.query("select * from public.payment_requests where id=$1", [payment.id]))
  .rows[0];
assert.equal(stored.current_step, 3);
assert.equal(stored.status, "submitted");
await assert.rejects(
  db.query(
    "select * from public.save_payment_request_revision($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
    [payment.id, revised.updated_at, [], ...args],
  ),
  /not editable/,
);
await login(staff);
await db.query("select * from public.transition_payment_request($1,'approve',null)", [payment.id]);
assert.equal((await db.query("select * from public.payment_workflow_actions")).rows.length, 5);
await db.close();
console.log(
  "PASS: migrations, RLS, ownership, reasons, optimistic revisions, same-step resubmit, preserved audit. Synthetic data only.",
);
