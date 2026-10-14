// Isolated database, synthetic records only. No credentials or production access.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
await db.exec(`create role anon; create role authenticated; create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,private to authenticated;
create type public.app_role as enum ('user','admin','procurement_staff');
create table public.profiles(id uuid primary key, role public.app_role, active boolean);
create sequence public.pol01_request_no_seq start 24;
create sequence public.w119_request_no_seq start 9;
select nextval('public.pol01_request_no_seq'); select nextval('public.w119_request_no_seq');`);
const sql = readFileSync("supabase/migrations/202610140003_w804_document_registry.sql", "utf8");
await db.exec(sql);
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const staff = "44444444-4444-4444-8444-444444444444";
const firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await db.exec(`insert into public.profiles values
('${owner}','user',true),('${other}','user',true),('${admin}','admin',true),('${staff}','procurement_staff',true);`);
const login = async (id, role = "authenticated") =>
  db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`,
  );
const payload = {
  format: "ubu-pol-w804",
  version: 1,
  title: "Synthetic document set",
  budget: { fiscalYear: "2570" },
  items: [{ quantity: 1.5, unitPrice: 1.01 }],
};
const save = (id = firstId, revision = 0, data = payload) =>
  rows("select * from public.save_w804_document_set($1,$2,$3)", [
    id,
    revision,
    JSON.stringify(data),
  ]);
await login(owner);
const first = (await save())[0];
assert.deepEqual(first, { id: firstId, request_no: "W804-001", revision: 1 });
assert.deepEqual(await save(), [first], "lost-response retry does not allocate another number");
assert.equal(
  (await rows("select total_amount from public.w804_document_sets"))[0].total_amount,
  "1.52",
);
const edited = { ...payload, title: "Edited synthetic set" };
assert.equal((await save(firstId, 1, edited))[0].request_no, "W804-001");
assert.equal((await save(firstId, 1, edited))[0].revision, 2, "update retry idempotent");
await assert.rejects(save(firstId, 1, payload), { code: "40001" });
await assert.rejects(save(secondId, 1), { code: "40001" });
await assert.rejects(rows("update public.w804_document_sets set request_no='W804-099'"), {
  code: "42501",
});
await assert.rejects(rows("delete from public.w804_document_sets"), { code: "42501" });
await assert.rejects(rows("select nextval('public.w804_request_no_seq')"), { code: "42501" });
await assert.rejects(rows("select private.next_w804_request_no()"), { code: "42501" });
await assert.rejects(
  save(secondId, 0, { ...payload, items: [{ quantity: 1, unitPrice: 50000.01 }] }),
  { code: "22023" },
);
for (const invalid of [
  null,
  {},
  { ...payload, items: null },
  { ...payload, title: " " },
  { ...payload, items: [{ quantity: null, unitPrice: 1 }] },
  { ...payload, items: [{ quantity: -1, unitPrice: 1 }] },
])
  await assert.rejects(save(secondId, 0, invalid), { code: "22023" });
await login(other);
assert.equal((await rows("select * from public.w804_document_sets")).length, 0);
await assert.rejects(save(firstId, 2, payload), { code: "42501" });
assert.equal((await save(secondId))[0].request_no, "W804-002");
await login(admin);
assert.equal((await rows("select * from public.w804_document_sets")).length, 2);
assert.equal((await save(firstId, 2, payload))[0].request_no, "W804-001");
await login(staff);
assert.equal((await rows("select * from public.w804_document_sets")).length, 0);
await assert.rejects(save(), { code: "42501" });
await db.exec(`reset role; update public.profiles set active=false where id='${owner}'`);
await login(owner);
assert.equal((await rows("select * from public.w804_document_sets")).length, 0);
await assert.rejects(save(), { code: "42501" });
await login("", "anon");
await assert.rejects(save(), { code: "42501" });
await assert.rejects(rows("select * from public.w804_document_sets"), { code: "42501" });
await db.exec("reset role");
await db.exec(sql);
assert.equal(
  (await rows("select last_value from public.w804_request_no_seq"))[0].last_value,
  2,
  "rerun never resets counter",
);
assert.equal((await rows("select last_value from public.pol01_request_no_seq"))[0].last_value, 24);
assert.equal((await rows("select last_value from public.w119_request_no_seq"))[0].last_value, 9);
await db.exec("select setval('public.w804_request_no_seq',999,true)");
await login(admin);
assert.equal((await save("cccccccc-cccc-4ccc-8ccc-cccccccccccc"))[0].request_no, "W804-1000");
await db.close();
console.log(
  "W804 registry SQL: allocation, retries, revision conflicts, RLS, limits, independent sequences and 1000+ passed",
);
