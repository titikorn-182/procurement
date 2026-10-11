# Payment workflow database test

Runs real PostgreSQL semantics in memory with **synthetic fixtures only**. It never uses application credentials or connects to Supabase.

Optional isolated runtime (not part of the deployed app):

```powershell
npm.cmd install --prefix .impeccable/sql-runtime --no-save --package-lock=false @electric-sql/pglite@0.3.14
$env:PGLITE_MODULE = [System.Uri]::new((Resolve-Path '.impeccable/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js').Path).AbsoluteUri
node tests/sql/payment-flow.mjs
```

Checks migration application, owner and non-owner RLS, mandatory return reasons, stale-revision rejection, revision audit retention and returned POL-02 resubmission to the same reviewer step. This isolated test does not replace staging verification against the deployed Supabase schema/storage service.
