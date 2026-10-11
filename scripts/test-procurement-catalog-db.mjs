// Optional isolated PostgreSQL/WASM integration check; never connects to Supabase.
// node scripts/test-procurement-catalog-db.mjs <pglite-package-dir> <private-import.sql>
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PGlite } = require(path.resolve(process.argv[2]));
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.profiles(id uuid primary key, role text, active boolean);
    create table private.role_permissions(role text, permission text);
    insert into private.role_permissions values ('user','request.create'),('admin','request.create'),('admin','system.manage');
    insert into public.profiles values
      ('11111111-1111-4111-8111-111111111111','user',true),
      ('22222222-2222-4222-8222-222222222222','admin',true),
      ('33333333-3333-4333-8333-333333333333','user',false);
    grant usage on schema public, private, auth to authenticated, anon;
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
  const source = await fs.readFile(process.argv[3], "utf8");
  await db.exec(source);
  await db.exec(source);
  const counts = await db.query(`select (select count(*) from catalog_imports)::int imports,
    (select count(*) from catalog_items)::int items, (select count(*) from catalog_prices)::int prices,
    (select count(*) from catalog_purchase_history)::int history,
    (select count(*) from catalog_source_rows)::int raw_rows`);
  assert.deepEqual(counts.rows[0], {
    imports: 1,
    items: 7,
    prices: 7,
    history: 294,
    raw_rows: 336,
  });
  const reconciliation = await db.query(`select i.item_code, i.name, i.specification, i.unit,
    i.image_reference, p.reference_price, p.source_name, r.raw_cells
    from catalog_prices p join catalog_items i on i.id=p.item_id
    join catalog_source_rows r on (r.import_id,r.sheet_name,r.row_number)=(p.import_id,p.sheet_name,p.row_number)`);
  for (const row of reconciliation.rows) {
    assert.equal(row.item_code, row.raw_cells[1]);
    assert.equal(row.name, row.raw_cells[4].trim());
    assert.equal(row.specification, row.raw_cells[5].trim());
    assert.equal(row.unit, row.raw_cells[6]);
    assert.equal(Number(row.reference_price), row.raw_cells[7]);
    assert.equal(row.source_name, row.raw_cells[8]);
    assert.match(row.image_reference, /^xlsx:[a-f0-9]{64}#xl\/media\/image\d+\.png$/);
  }
  const asUser = async (id, role = "authenticated") => {
    await db.exec(
      `reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`,
    );
  };
  const search = async (query = "", category = "", page = 0) =>
    (
      await db.query("select public.search_procurement_catalog($1,$2,$3) result", [
        query,
        category,
        page,
      ])
    ).rows[0].result;
  await asUser("11111111-1111-4111-8111-111111111111");
  const actual = await search();
  assert.equal(actual.total, 7);
  assert.equal(actual.items.length, 7);
  assert.equal(actual.categories.length, 4);
  assert.ok(
    actual.items.every((row) => row.status === "unverified" && row.reference_date === null),
  );
  assert.equal((await search("A4")).total, 2);
  assert.equal((await search("OFF-001-03")).items[0].reference_price, 90);
  assert.equal((await search("", "COM")).total, 0);
  assert.equal((await search("%_' OR true --")).total, 0);
  assert.equal((await search("", "", 1)).items.length, 0);
  await assert.rejects(search("", "", -1));
  assert.equal((await db.query("select * from public.catalog_source_rows")).rows.length, 0);
  assert.equal((await db.query("select * from public.catalog_prices")).rows.length, 0);
  await assert.rejects(db.query("insert into catalog_categories(code,name) values('BAD','bad')"));
  await assert.rejects(db.query("delete from catalog_items"));
  // Produce a private fixture only for local visual QA from the real source import.
  await fs.mkdir("output/pdf/catalog", { recursive: true });
  await fs.writeFile("output/pdf/catalog/actual-data.json", JSON.stringify(actual, null, 2));
  await asUser("33333333-3333-4333-8333-333333333333");
  await assert.rejects(search());
  await asUser("", "anon");
  await assert.rejects(search());
  await asUser("22222222-2222-4222-8222-222222222222");
  assert.equal((await db.query("select * from catalog_source_rows")).rows.length, 336);
  await assert.rejects(db.query("update catalog_prices set status='verified'"));
  await db.query("update catalog_prices set valid_until='2000-01-01' where id=$1", [
    actual.items[0].price_id,
  ]);
  assert.equal((await search(actual.items[0].item_code)).items[0].expired, true);
  await db.query("update catalog_prices set status='withdrawn' where id=$1", [
    actual.items[0].price_id,
  ]);
  assert.equal((await search(actual.items[0].item_code)).total, 0);
  await db.exec("reset role");
  // Existing metadata must not be overwritten by re-import, and errors must roll back.
  await db.query("update catalog_items set unit='changed' where item_code='OFF-001-01'");
  await assert.rejects(db.exec(source));
  await db.exec("rollback");
  assert.equal((await db.query("select count(*)::int n from catalog_imports")).rows[0].n, 1);
  console.log(
    JSON.stringify({
      result: "PASS",
      counts: counts.rows[0],
      checks: [
        "migration",
        "real import twice",
        "source reconciliation",
        "search and pagination",
        "RLS user/admin/inactive/anon",
        "verified constraints",
        "expiry and withdrawal",
        "metadata conflict rollback",
      ],
    }),
  );
} finally {
  await db.close();
}
