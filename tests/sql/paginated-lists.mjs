// Isolated PostgreSQL/RLS integration, no network or production credentials.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
process.on("uncaughtException", (error) => {
  console.error(error.message, error.code, error.detail);
  process.exit(1);
});
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb default '{}');
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema auth,storage to authenticated;
grant all on all tables in schema storage to authenticated;`);
for (const file of [
  "202608030001_initial_procurement.sql",
  "202608030002_storage_and_role_admin.sql",
  "202608090004_w119_request_form.sql",
  "202608300001_authorization_hardening.sql",
  "202608300003_payment_workflow_hardening.sql",
  "202610020007_pol02_payment_form.sql",
  "202610110005_paginated_request_lists.sql",
])
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
await db.exec(`insert into auth.users(id,email) values ('${owner}','owner@test.invalid'),('${other}','other@test.invalid'),('${admin}','admin@test.invalid');
insert into public.profiles(id,full_name,role) values ('${owner}','Synthetic owner','user'),('${other}','Other owner','user'),('${admin}','Admin','admin') on conflict(id) do update set role=excluded.role,full_name=excluded.full_name;
insert into public.departments(code,name_th) values ('QA','หน่วยงานทดสอบ');
insert into public.procurement_requests(request_no,requester_id,department_id,kind,title,rationale,required_date,budget_year,fund_source,estimated_amount,status,created_at)
select 'QA-'||lpad(n::text,5,'0'),'${owner}',(select id from public.departments where code='QA'),
  case when n=1005 then 'hire'::public.request_kind else 'purchase'::public.request_kind end,
  case when n=1005 then 'oldest 100%_ literal' else 'Synthetic '||n end,'Testing only',current_date,2570,'income',1000,
  case when n=1005 then 'returned'::public.request_status else 'submitted'::public.request_status end,
  '2026-01-01'::timestamptz - n * interval '1 minute'
from generate_series(1,1005) n;
insert into public.procurement_requests(request_no,requester_id,department_id,kind,title,rationale,required_date,budget_year,fund_source,estimated_amount,status)
values ('PRIVATE','${other}',(select id from public.departments where code='QA'),'purchase','Not authorized','Testing only',current_date,2570,'income',1,'draft');
insert into public.payment_requests(payment_no,procurement_request_id,requester_id,invoice_no,invoice_date,delivery_detail,subtotal,form_data,status,created_at)
select 'PAY-'||r.request_no,r.id,r.requester_id,'QA-INVOICE',current_date,'Synthetic delivery',1000,
  jsonb_build_object('subject','Subject '||r.title,'departmentName','Payment department','requesterName','Fallback owner'),
  'draft',r.created_at from public.procurement_requests r;`);
async function login(id) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
await login(owner);
assert.equal(
  (await db.query("select count(*)::int as n from public.procurement_request_list")).rows[0].n,
  1005,
);
assert.equal(
  (await db.query("select count(*)::int as n from public.payment_request_list")).rows[0].n,
  1005,
);
const page = (
  await db.query(
    "select request_no from public.procurement_request_list order by created_at desc,id desc limit 10 offset 1000",
  )
).rows;
assert.equal(page.length, 5);
assert.equal(page[4].request_no, "QA-01005");
assert.equal(
  (
    await db.query(
      "select request_no from public.procurement_request_list where search_text ilike $1",
      ["%oldest 100\\%\\_ literal%"],
    )
  ).rows[0].request_no,
  "QA-01005",
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from public.procurement_request_list where search_text ilike '%หน่วยงานทดสอบ%' and kind='hire' and list_status='returned'",
    )
  ).rows[0].n,
  1,
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from public.procurement_request_list where list_status='review'",
    )
  ).rows[0].n,
  1004,
);
for (const term of ["Payment department", "Subject oldest", "Synthetic owner", "QA-01005"]) {
  assert.ok(
    (
      await db.query(
        "select count(*)::int as n from public.payment_request_list where search_text ilike $1",
        [`%${term}%`],
      )
    ).rows[0].n > 0,
  );
}
assert.equal(
  (
    await db.query(
      "select * from public.procurement_request_list where search_text ilike '%PRIVATE%'",
    )
  ).rows.length,
  0,
);
await assert.rejects(
  db.query("delete from public.procurement_request_list"),
  /permission|cannot delete from view/,
);
await assert.rejects(
  db.query("delete from public.payment_request_list"),
  /permission|cannot delete from view/,
);
assert.equal(
  (
    await db.query(
      "select has_table_privilege('authenticated','public.procurement_request_list','INSERT,UPDATE,DELETE') as writable",
    )
  ).rows[0].writable,
  false,
);
assert.equal(
  (
    await db.query(
      "select has_table_privilege('authenticated','public.payment_request_list','INSERT,UPDATE,DELETE') as writable",
    )
  ).rows[0].writable,
  false,
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from public.procurement_request_list where search_text ~* $1",
      ["100%_ literal"],
    )
  ).rows[0].n,
  1,
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from public.procurement_request_list where search_text ~* $1",
      ["\\*"],
    )
  ).rows[0].n,
  0,
);
await login(other);
assert.equal(
  (await db.query("select request_no from public.procurement_request_list")).rows[0].request_no,
  "PRIVATE",
);
assert.equal(
  (await db.query("select count(*)::int as n from public.payment_request_list")).rows[0].n,
  1,
);
await login(admin);
assert.equal(
  (await db.query("select count(*)::int as n from public.procurement_request_list")).rows[0].n,
  1006,
);
await db.exec("reset role; set role anon");
await assert.rejects(db.query("select * from public.procurement_request_list"), /permission/);
await assert.rejects(db.query("select * from public.payment_request_list"), /permission/);
await db.exec("reset role");
await db.exec(`insert into public.workflow_tasks(request_id,step_no,step_name,required_role,due_at)
select id,1,'Synthetic overdue task','procurement_staff',now()-interval '1 day' from public.procurement_requests where request_no='QA-01005';`);
await login(owner);
assert.equal(
  (
    await db.query(
      "select list_status from public.procurement_request_list where request_no='QA-01005'",
    )
  ).rows[0].list_status,
  "overdue",
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from public.procurement_request_list where list_status='returned'",
    )
  ).rows[0].n,
  0,
);
await db.exec("reset role");
await db.exec(`update public.profiles set active=false where id='${owner}'`);
await login(owner);
// Preserve the existing policy: inactive owners can still read their own rows.
// This migration must neither expand nor silently redesign that policy.
for (const [view, table] of [
  ["procurement_request_list", "procurement_requests"],
  ["payment_request_list", "payment_requests"],
]) {
  assert.equal(
    (await db.query(`select count(*)::int as n from public.${view}`)).rows[0].n,
    (await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n,
  );
}
await db.exec("reset role");
for (const view of ["procurement_request_list", "payment_request_list"]) {
  const options = (await db.query("select reloptions from pg_class where relname=$1", [view]))
    .rows[0].reloptions;
  assert.ok(options.includes("security_invoker=true"));
}
const expectedColumns = {
  procurement_request_list: [
    "id",
    "request_no",
    "kind",
    "title",
    "estimated_amount",
    "budget_year",
    "status",
    "current_step",
    "created_at",
    "required_date",
    "department_name",
    "requester_name",
    "list_status",
    "search_text",
  ],
  payment_request_list: [
    "id",
    "payment_no",
    "total_amount",
    "status",
    "current_step",
    "created_at",
    "subject",
    "requester_name",
    "department_name",
    "source_no",
    "search_text",
  ],
};
for (const [view, columns] of Object.entries(expectedColumns)) {
  assert.deepEqual(
    (
      await db.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",
        [view],
      )
    ).rows.map((row) => row.column_name),
    columns,
  );
}
console.log(
  "PASS: 1005-row pagination/search, related fields, status/kind filters, literal wildcards, owner/non-owner/admin/anonymous RLS, read-only views",
);
await db.close();
