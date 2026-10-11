# Synthetic PostgreSQL tests

Runs real PostgreSQL semantics in memory with **synthetic fixtures only**. It never uses application credentials or connects to Supabase.

PGlite is a pinned development dependency, not an application dependency. After `npm ci`, run both suites locally or in CI:

```sh
npm run test:sql
```

Optional isolated runtime override (for manual diagnostics):

```powershell
npm.cmd install --prefix .impeccable/sql-runtime --no-save --package-lock=false @electric-sql/pglite@0.3.14
$env:PGLITE_MODULE = [System.Uri]::new((Resolve-Path '.impeccable/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js').Path).AbsoluteUri
node tests/sql/payment-flow.mjs
node tests/sql/paginated-lists.mjs
```

Checks migration application, owner and non-owner RLS, mandatory return reasons, stale-revision rejection, revision audit retention and returned POL-02 resubmission to the same reviewer step. This isolated test does not replace staging verification against the deployed Supabase schema/storage service.

The paginated-list suite creates 1,005 synthetic requests and payments, tests search beyond the old 1,000-row cap, related-field filters, overdue precedence, literal patterns, owner/non-owner/admin/anonymous visibility, read-only grants, and `security_invoker` view options. Inactive-owner visibility intentionally matches existing base-table policies; it is not changed by pagination.
