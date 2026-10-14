// Isolated PostgreSQL/RLS checks. No production data or credentials.
const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
process.on("uncaughtException", (error) => {
  console.error(error.message, error.code, error.where, error.internalQuery);
  process.exit(1);
});
const migration = (file) => db.exec(readFileSync(`supabase/migrations/${file}.sql`, "utf8"));
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
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
  "202608030001_initial_procurement",
  "202608030002_storage_and_role_admin",
  "202608090004_w119_request_form",
  "202608300001_authorization_hardening",
  "202608300003_payment_workflow_hardening",
  "202610020002_fix_request_draft_creation",
  "202610020007_pol02_payment_form",
  "202610050002_pol01_request_numbering",
  "202610110005_paginated_request_lists",
])
  await migration(file);

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
await db.exec(`insert into auth.users(id,email) values ('${owner}','owner@test.invalid'),('${other}','other@test.invalid'),('${admin}','admin@test.invalid');
insert into public.departments(code,name_th) values ('QA','Synthetic department');
update public.profiles set department_id=(select id from public.departments where code='QA'), role=case when id='${admin}' then 'admin'::public.app_role else 'user'::public.app_role end;
insert into public.procurement_requests(request_no,requester_id,department_id,kind,title,rationale,required_date,budget_year,fund_source,estimated_amount,status,form_data,created_at)
values ('POL01-017','${owner}',(select id from public.departments where code='QA'),'purchase','Legacy W119','Synthetic only',current_date,2570,'income',100,'returned','{"formType":"w119","documentNo":"อว 0604.19/123"}','2026-01-01'),
('POL01-019','${other}',(select id from public.departments where code='QA'),'purchase','Private W119','Synthetic only',current_date,2570,'income',100,'draft','{"formType":"w119"}','2026-01-02'),
('POL01-018','${owner}',(select id from public.departments where code='QA'),'purchase','Standard request','Synthetic only',current_date,2570,'income',100,'draft','{"formType":"standard"}','2026-01-03');
select setval('public.pol01_request_no_seq',19,true);
insert into public.request_items(request_id,line_no,description,quantity,unit,unit_price)
select id,1,'Synthetic item',1,'unit',100 from public.procurement_requests;
insert into public.request_attachments(request_id,file_name,storage_path,mime_type,size_bytes,uploaded_by)
select id,'original.pdf',id||'/original.pdf','application/pdf',100,'${owner}' from public.procurement_requests where request_no='POL01-017';
insert into public.workflow_actions(request_id,actor_id,action,comment)
select id,'${admin}','return','Original reference POL01-017' from public.procurement_requests where request_no='POL01-017';
insert into public.payment_requests(procurement_request_id,requester_id,invoice_no,invoice_date,delivery_detail,subtotal,form_data,status)
select id,'${owner}','QA-INVOICE',current_date,'Synthetic delivery',100,'{"subject":"Original POL01-017"}','draft' from public.procurement_requests where request_no='POL01-017';`);
const original = (
  await rows("select * from public.procurement_requests where request_no='POL01-017'")
)[0];
const relatedTables = [
  "request_items",
  "request_attachments",
  "workflow_actions",
  "payment_requests",
];
const snapshots = await Promise.all(
  relatedTables.map((t) => rows(`select * from public.${t} order by id`)),
);
await migration("202610140001_request_number_aliases");
assert.equal(
  (await rows("select request_no from public.procurement_requests where id=$1", [original.id]))[0]
    .request_no,
  "POL01-017",
);
await migration("202610140002_w119_request_numbering");
const changed = (
  await rows("select * from public.procurement_requests where id=$1", [original.id])
)[0];
assert.equal(changed.request_no, "W119-001");
for (const key of Object.keys(original).filter(
  (key) => !["request_no", "updated_at"].includes(key),
))
  assert.deepEqual(changed[key], original[key], key);
for (let i = 0; i < relatedTables.length; i++)
  assert.deepEqual(
    await rows(`select * from public.${relatedTables[i]} order by id`),
    snapshots[i],
  );
assert.equal(
  (
    await rows("select request_no from public.procurement_requests where title='Standard request'")
  )[0].request_no,
  "POL01-018",
);
await migration("202610140001_request_number_aliases");
await migration("202610140002_w119_request_numbering");
assert.equal((await rows("select count(*)::int n from public.request_number_aliases"))[0].n, 2);

async function login(id) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
await login(owner);
for (const number of ["POL01-017", "W119-001"]) {
  assert.deepEqual(
    await rows("select * from public.resolve_procurement_request_number($1)", [number]),
    [{ request_id: original.id, request_no: "W119-001", previous_request_nos: ["POL01-017"] }],
  );
  assert.equal(
    (
      await rows(
        "select request_no from public.procurement_request_list where search_text ilike $1",
        [`%${number}%`],
      )
    )[0].request_no,
    "W119-001",
  );
  assert.equal(
    (
      await rows("select source_no from public.payment_request_list where search_text ilike $1", [
        `%${number}%`,
      ])
    )[0].source_no,
    "W119-001",
  );
}
for (const number of ["POL01-019", "W119-002", "does-not-exist"])
  assert.deepEqual(
    await rows("select * from public.resolve_procurement_request_number($1)", [number]),
    [],
  );
assert.equal((await rows("select count(*)::int n from public.request_number_aliases"))[0].n, 1);
await assert.rejects(db.query("delete from public.request_number_aliases"), /permission denied/);
await assert.rejects(db.query("select private.next_w119_request_no()"), /permission denied/);

const form = {
  formType: "w119",
  formVersion: 1,
  documentNo: "อว 0604.19/123",
  memoDate: "2026-10-14",
  departmentName: "Synthetic",
  phone: "000",
  addressee: "Synthetic",
  budgetCodes: {},
};
const items = [
  {
    line_no: 1,
    description: "Synthetic item",
    quantity: 1,
    unit: "unit",
    unit_price: 100,
    market_price: 100,
    price_source: "Synthetic source",
  },
];
const create = (data) =>
  rows(
    "select * from public.create_procurement_request_draft('purchase','Synthetic request','Synthetic rationale',current_date,2570,'income','','',$1::jsonb,$2::jsonb)",
    [JSON.stringify(data), JSON.stringify(items)],
  );
assert.equal((await create(form))[0].request_no, "W119-003");
const standard = {
  formType: "standard",
  formVersion: 1,
  advanceFundingOption: "reimburse_after_purchase",
  budgetCodes: { departmentCode: "1", fundCode: "1", activityCode: "1" },
};
assert.equal((await create(standard))[0].request_no, "POL01-020");
// PGlite serializes on one connection; this is not a multi-connection load test.
const allocated = (await Promise.all(Array.from({ length: 20 }, () => create(form))))
  .flat()
  .map((r) => r.request_no);
assert.equal(new Set(allocated).size, 20);
assert.ok(allocated.includes("W119-023"));
await login(admin);
assert.equal(
  (await rows("select * from public.resolve_procurement_request_number('POL01-019')"))[0]
    .request_no,
  "W119-002",
);
await db.exec(
  "reset role; select setval('public.w119_request_no_seq',999,false); select setval('public.pol01_request_no_seq',999,false);",
);
await login(owner);
assert.equal((await create(form))[0].request_no, "W119-999");
assert.equal((await create(form))[0].request_no, "W119-1000");
assert.equal((await create(standard))[0].request_no, "POL01-999");
assert.equal((await create(standard))[0].request_no, "POL01-1000");
await db.exec("reset role;");
await migration("202610140002_w119_request_numbering");
await login(owner);
assert.equal((await create(form))[0].request_no, "W119-1001");
await db.exec("reset role; set role anon;");
await assert.rejects(
  db.query("select * from public.resolve_procurement_request_number('POL01-017')"),
  /permission denied/,
);
await db.close();
console.log(
  "W119 numbering: migration, history/FKs, aliases/RLS/search, real creation RPC, independent counters, reruns and >999 passed.",
);
