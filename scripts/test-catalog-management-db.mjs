// Isolated PostgreSQL/WASM checks; this script never connects to Supabase.
// node scripts/test-catalog-management-db.mjs <pglite-package-dir> <private-import.sql>
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PGlite } = require(path.resolve(process.argv[2]));
const db = new PGlite();
const USER = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const INACTIVE = "33333333-3333-4333-8333-333333333333";
const OTHER_ADMIN = "44444444-4444-4444-8444-444444444444";
const checks = [];

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema private; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(id uuid primary key,role text,active boolean);
    create table private.role_permissions(role text,permission text);
    insert into private.role_permissions values
      ('user','request.create'),('admin','request.create'),('admin','system.manage');
    insert into public.profiles values
      ('${USER}','user',true),('${ADMIN}','admin',true),
      ('${INACTIVE}','admin',false),('${OTHER_ADMIN}','admin',true);
    create table storage.buckets(id text primary key,name text,public boolean,
      file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id),name text not null,owner_id text,metadata jsonb,
      unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema public,private,auth,storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  const authorization = await fs.readFile(
    "supabase/migrations/202608300001_authorization_hardening.sql",
    "utf8",
  );
  const permission = authorization.match(
    /create or replace function private\.has_permission[\s\S]*?\$\$;/,
  )?.[0];
  assert.ok(permission);
  await db.exec(permission);
  await db.exec(
    await fs.readFile("supabase/migrations/202610110001_procurement_catalog.sql", "utf8"),
  );
  const originalImport = await fs.readFile(process.argv[3], "utf8");
  await db.exec(originalImport);
  await db.exec(
    await fs.readFile("supabase/migrations/202610110002_catalog_management.sql", "utf8"),
  );
  await db.exec(originalImport);
  await db.exec(originalImport);
  const count = async (table) =>
    (await db.query(`select count(*)::int n from public.${table}`)).rows[0].n;
  assert.equal(await count("catalog_items"), 7);
  assert.equal(await count("catalog_prices"), 7);
  assert.equal(await count("catalog_purchase_history"), 294);
  assert.equal(await count("catalog_source_rows"), 336);
  assert.equal(await count("catalog_imports"), 1);
  assert.equal(await count("catalog_item_revisions"), 0);
  const imported = (await db.query("select * from catalog_prices order by id")).rows;
  assert.ok(imported.every((row) => row.origin === "excel" && row.created_by === null));
  const bucket = (await db.query("select * from storage.buckets where id='catalog-images'"))
    .rows[0];
  assert.equal(bucket.public, false);
  assert.equal(Number(bucket.file_size_limit), 2 * 1024 * 1024);
  assert.deepEqual(bucket.allowed_mime_types, ["image/jpeg", "image/png", "image/webp"]);
  checks.push("original import remains idempotent after migration; 7 prices / 294 history");

  const asUser = async (id, role = "authenticated") => {
    await db.exec(`reset role; set role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const asOwner = async () => db.exec("reset role");
  const search = async (query = "", category = "", page = 0, admin = false) =>
    (
      await db.query(
        `select public.${admin ? "search_procurement_catalog_admin" : "search_procurement_catalog"}($1,$2,$3) result`,
        [query, category, page],
      )
    ).rows[0].result;
  const save = async (payload) =>
    (
      await db.query("select public.save_procurement_catalog_item($1::jsonb) result", [
        JSON.stringify(payload),
      ])
    ).rows[0].result;
  const imagePath = async (id) =>
    (await db.query("select public.catalog_image_path($1) path", [id])).rows[0].path;
  const rejected = async (promise, code) =>
    assert.rejects(promise, code ? (error) => error.code === code : undefined);
  const basePrice = {
    reference_price: 12.3,
    source_name: "แหล่งราคาเพื่อทดสอบ",
    reference_date: null,
    valid_until: null,
  };
  const draft = (id = randomUUID(), code = "TEST-001") => ({
    item_id: id,
    expected_version: null,
    item_code: code,
    category_code: "OFF",
    subcategory: "ทดสอบ",
    name: "รายการเพื่อทดสอบระบบ",
    specification: "หน่วยทดสอบ",
    unit: "อัน",
    notes: "",
    active: true,
    image_path: null,
    price: { ...basePrice },
  });
  const payload = draft();

  await asUser(USER);
  const initial = await search();
  assert.equal(initial.total, 7);
  assert.ok(
    initial.items.every(
      (row) => row.origin === "excel" && row.version === 1 && row.active && row.image_path === null,
    ),
  );
  await rejected(save(payload), "42501");
  await rejected(search("", "", 0, true), "42501");
  assert.equal(await count("catalog_item_revisions"), 0);
  assert.equal(await count("catalog_prices"), 0);
  assert.equal(await imagePath(randomUUID()), null);
  await rejected(db.query("select private.procurement_catalog_data('','',0,true)"), "42501");
  for (const [identity, role] of [
    [INACTIVE, "authenticated"],
    ["", "anon"],
  ]) {
    await asUser(identity, role);
    await rejected(search(), "42501");
    await rejected(search("", "", 0, true), "42501");
    await rejected(save(payload), "42501");
    await rejected(imagePath(payload.item_id), "42501");
  }
  checks.push("user/inactive/anonymous authorization; no private helper access");

  await asUser(ADMIN);
  await rejected(db.query("update catalog_items set name='bypass'"), "42501");
  await rejected(db.query("update catalog_prices set reference_price=1"), "42501");
  await rejected(db.query("delete from catalog_prices"), "42501");
  await rejected(
    db.query(
      "insert into catalog_items(item_code,category_code,subcategory,name,specification,unit) values('BYPASS','OFF','','bad','','unit')",
    ),
    "42501",
  );
  await rejected(db.query("delete from catalog_item_revisions"), "42501");
  await rejected(save({ ...payload, price: null }), "22023");
  for (const bad of [
    { ...payload, active: "true" },
    { ...payload, expected_version: "1" },
    { ...payload, item_id: "not-a-uuid" },
    { ...payload, item_code: "invalid code" },
    { ...payload, subcategory: "x".repeat(101) },
    { ...payload, price: { ...basePrice, status: "verified" } },
    { ...payload, created_by: OTHER_ADMIN },
    { ...payload, name: "   " },
    { ...payload, price: { ...basePrice, reference_price: -1 } },
    { ...payload, price: { ...basePrice, reference_price: 0.001 } },
    { ...payload, price: { ...basePrice, reference_price: 1_000_000_000_000 } },
    { ...payload, price: { ...basePrice, source_name: " " } },
    { ...payload, price: { ...basePrice, valid_until: "2026-10-10" } },
    {
      ...payload,
      price: { ...basePrice, reference_date: "2026-10-11", valid_until: "2026-10-10" },
    },
  ])
    await rejected(save(bad), "22023");
  await rejected(save({ ...payload, price: { ...basePrice, reference_date: "2026-02-30" } }));
  const created = await save(payload);
  assert.deepEqual(created, { item_id: payload.item_id, version: 1 });
  const manual = (await search(payload.item_code)).items[0];
  assert.equal(manual.origin, "manual");
  assert.equal(manual.reference_price, basePrice.reference_price);
  assert.equal(manual.status, "unverified");
  for (const key of ["import_id", "sheet_name", "row_number", "file_name", "reference_date"])
    assert.equal(manual[key], null);
  assert.equal(await count("catalog_item_revisions"), 1);
  assert.equal(await count("catalog_prices"), 8);
  await rejected(save(payload), "40001");
  await rejected(save({ ...payload, item_id: randomUUID() }), "23505");
  assert.equal(await count("catalog_item_revisions"), 1);
  assert.equal(await count("catalog_prices"), 8);
  checks.push(
    "manual provenance; strict inputs; no certification spoof; duplicate/replay atomicity",
  );

  payload.expected_version = 1;
  payload.price = null;
  payload.notes = "metadata only";
  assert.equal((await save(payload)).version, 2);
  assert.equal(await count("catalog_prices"), 8);
  await rejected(save(payload), "40001");
  payload.expected_version = 2;
  await rejected(save({ ...payload, unit: "กล่อง" }), "22023");
  await rejected(save({ ...payload, name: "changed name" }), "22023");
  await rejected(save({ ...payload, specification: "changed specification" }), "22023");
  assert.equal((await search(payload.item_code)).items[0].version, 2);
  payload.unit = "กล่อง";
  payload.price = { ...basePrice, reference_price: 24.6 };
  assert.equal((await save(payload)).version, 3);
  assert.equal(await count("catalog_prices"), 9);
  const newPrice = (await search(payload.item_code)).items[0];
  assert.equal(newPrice.reference_price, 24.6);
  assert.notEqual(newPrice.price_id, manual.price_id);
  assert.equal(
    Number(
      (await db.query("select reference_price from catalog_prices where id=$1", [manual.price_id]))
        .rows[0].reference_price,
    ),
    12.3,
  );
  const revisions = (
    await db.query("select * from catalog_item_revisions where item_id=$1 order by version", [
      payload.item_id,
    ])
  ).rows;
  assert.equal(revisions[0].before_state, null);
  assert.equal(revisions[1].before_state.notes, "");
  assert.equal(revisions[1].after_state.notes, "metadata only");
  assert.equal(revisions[1].price_id, null);
  assert.equal(revisions[2].after_state.unit, "กล่อง");
  assert.ok(revisions.every((row) => row.actor_id === ADMIN));
  checks.push(
    "optimistic conflict; metadata-only save; unit/name/spec price requirement; append-only audit",
  );

  const assetPath = (itemId = payload.item_id, owner = ADMIN, ext = "png") =>
    `items/${itemId}/${owner}/${randomUUID()}.${ext}`;
  const upload = async (name, owner = ADMIN, mime = "image/png", size = 128) =>
    db.query(
      "insert into storage.objects(bucket_id,name,owner_id,metadata) values('catalog-images',$1,$2,$3::jsonb)",
      [name, owner, JSON.stringify({ mimetype: mime, size })],
    );
  const firstPath = assetPath();
  await upload(firstPath);
  payload.expected_version = 3;
  payload.price = null;
  await rejected(save({ ...payload, image_path: assetPath() }), "22023");
  await rejected(save({ ...payload, image_path: assetPath(randomUUID()) }), "22023");
  await rejected(
    save({ ...payload, image_path: assetPath(payload.item_id, OTHER_ADMIN) }),
    "22023",
  );
  const wrongMime = assetPath();
  await upload(wrongMime, ADMIN, "image/svg+xml");
  await rejected(save({ ...payload, image_path: wrongMime }), "22023");
  const tooLarge = assetPath();
  await upload(tooLarge, ADMIN, "image/png", 2097153);
  await rejected(save({ ...payload, image_path: tooLarge }), "22023");
  await rejected(upload("arbitrary/file.png"), "42501");
  await rejected(upload(assetPath(payload.item_id, OTHER_ADMIN), OTHER_ADMIN), "42501");
  payload.image_path = firstPath;
  assert.equal((await save(payload)).version, 4);
  assert.equal(await imagePath(payload.item_id), firstPath);
  const storageBefore = (await db.query("select count(*)::int n from storage.objects")).rows[0].n;
  assert.equal(storageBefore, 3);
  assert.equal(
    (await db.query("update storage.objects set name='overwrite' returning id")).rows.length,
    0,
  );
  assert.equal((await db.query("delete from storage.objects returning id")).rows.length, 0);
  await asUser(USER);
  assert.deepEqual((await db.query("select name from storage.objects")).rows, [
    { name: firstPath },
  ]);
  assert.equal(await imagePath(payload.item_id), firstPath);
  await rejected(upload(assetPath(payload.item_id, USER), USER), "42501");
  await asUser(OTHER_ADMIN);
  payload.expected_version = 4;
  payload.notes = "another administrator keeps current image";
  assert.equal((await save(payload)).version, 5);
  const secondPath = assetPath(payload.item_id, OTHER_ADMIN, "webp");
  await upload(secondPath, OTHER_ADMIN, "image/webp");
  payload.expected_version = 5;
  payload.image_path = secondPath;
  assert.equal((await save(payload)).version, 6);
  await asUser(USER);
  assert.deepEqual((await db.query("select name from storage.objects")).rows, [
    { name: secondPath },
  ]);
  assert.equal(await imagePath(payload.item_id), secondPath);
  await asUser(ADMIN);
  assert.equal((await db.query("select count(*)::int n from storage.objects")).rows[0].n, 4);
  checks.push(
    "private current-image reads; upload ownership/MIME/size; replacement retains old objects",
  );

  payload.expected_version = 6;
  payload.active = false;
  assert.equal((await save(payload)).version, 7);
  assert.equal((await search(payload.item_code)).total, 0);
  assert.equal((await search(payload.item_code, "", 0, true)).items[0].active, false);
  assert.equal(await imagePath(payload.item_id), secondPath);
  await asUser(USER);
  assert.equal(await imagePath(payload.item_id), null);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await asUser(ADMIN);
  payload.expected_version = 7;
  payload.active = true;
  assert.equal((await save(payload)).version, 8);
  await asOwner();
  await db.query("update catalog_prices set status='withdrawn' where id=$1", [newPrice.price_id]);
  await asUser(ADMIN);
  assert.equal((await search(payload.item_code)).total, 0);
  assert.equal((await search(payload.item_code, "", 0, true)).items[0].status, "withdrawn");
  payload.expected_version = 8;
  payload.notes = "withdrawn remains withdrawn";
  assert.equal((await save(payload)).version, 9);
  assert.equal((await search(payload.item_code)).total, 0);
  await asUser(USER);
  assert.equal(await imagePath(payload.item_id), null);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await asUser(ADMIN);
  payload.expected_version = 9;
  payload.price = {
    ...basePrice,
    reference_price: 0,
    reference_date: "2000-01-01",
    valid_until: "2000-01-02",
  };
  assert.equal((await save(payload)).version, 10);
  const expired = (await search(payload.item_code)).items[0];
  assert.equal(expired.reference_price, 0);
  assert.equal(expired.expired, true);
  assert.equal(expired.status, "unverified");
  checks.push(
    "inactive/withdrawn hidden from requesters including images; no price resurrection; expiry",
  );

  payload.expected_version = 10;
  payload.image_path = null;
  payload.price = null;
  assert.equal((await save(payload)).version, 11);
  assert.equal(await imagePath(payload.item_id), null);
  assert.equal((await db.query("select count(*)::int n from storage.objects")).rows[0].n, 4);
  assert.equal((await search("%_' OR true --")).total, 0);
  assert.equal((await search("", "COM")).total, 0);
  assert.equal((await search("", "", 1)).items.length, 0);
  for (const admin of [false, true]) {
    await rejected(search("", "", -1, admin), "22023");
    await rejected(search("", "", 10001, admin), "22023");
    await rejected(search("x".repeat(121), "", 0, admin), "22023");
    await rejected(search("", "x".repeat(31), 0, admin), "22023");
  }
  await asOwner();
  assert.equal(await count("catalog_item_revisions"), 11);
  const unchangedExcelPrices = (
    await db.query("select * from catalog_prices where origin='excel' order by id")
  ).rows;
  assert.deepEqual(unchangedExcelPrices, imported);
  assert.equal(await count("catalog_prices"), 10);
  assert.equal(await count("catalog_purchase_history"), 294);
  assert.equal(await count("catalog_source_rows"), 336);
  await rejected(
    db.query(
      "insert into catalog_prices(item_id,origin,reference_price,source_name,created_by) values($1,'excel',1,'bad',$2)",
      [payload.item_id, ADMIN],
    ),
    "23514",
  );
  await rejected(
    db.query(
      "insert into catalog_prices(item_id,origin,reference_price,source_name) values($1,'manual',1,'bad')",
      [payload.item_id],
    ),
    "23514",
  );
  checks.push("clear image retains original; bounded search; Excel provenance/history unchanged");

  const originalItem = (
    await db.query("select * from catalog_items where id=$1", [initial.items[0].item_id])
  ).rows[0];
  const importedEdit = {
    ...draft(originalItem.id, originalItem.item_code),
    expected_version: originalItem.version,
    category_code: originalItem.category_code,
    subcategory: originalItem.subcategory,
    name: originalItem.name,
    specification: originalItem.specification,
    unit: originalItem.unit,
    notes: "administrator maintenance of workbook item",
    price: null,
  };
  await asUser(ADMIN);
  assert.equal((await save(importedEdit)).version, 2);
  assert.equal((await search(importedEdit.item_code)).items[0].origin, "excel");
  importedEdit.expected_version = 2;
  importedEdit.price = { ...basePrice, reference_price: 101.5 };
  assert.equal((await save(importedEdit)).version, 3);
  assert.equal((await search(importedEdit.item_code)).items[0].origin, "manual");
  await asOwner();
  const maintained = (await db.query("select * from catalog_items where id=$1", [originalItem.id]))
    .rows[0];
  assert.equal(maintained.image_reference, originalItem.image_reference);
  assert.deepEqual(
    (await db.query("select * from catalog_prices where origin='excel' order by id")).rows,
    imported,
  );
  await rejected(db.exec(originalImport));
  await db.exec("rollback");
  assert.equal(await count("catalog_imports"), 1);
  assert.equal(await count("catalog_prices"), 11);
  assert.equal(await count("catalog_item_revisions"), 13);
  checks.push(
    "Excel item can be maintained without rewriting source; re-import conflict rolls back",
  );
  console.log(JSON.stringify({ result: "PASS", checks }, null, 2));
} finally {
  await db.close();
}
