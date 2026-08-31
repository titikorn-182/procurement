# Supabase database setup

The application is connected to project `jwklnuzrewkrdtebvaid`, but database migrations
must be deployed with an authenticated Supabase CLI session or pasted into the SQL Editor.
The anon key and service-role key cannot execute DDL.

## Deploy with the CLI

1. Rotate the service-role key that was previously exposed. It is not used by this project.
2. Create a personal access token at Supabase Dashboard → Account → Access Tokens.
3. Set `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in the terminal environment.
4. Run:

```powershell
npx supabase link --project-ref jwklnuzrewkrdtebvaid
npx supabase db push
```

Alternatively, run the migration files in timestamp order through Dashboard → SQL Editor.

## Security hardening migrations

The `202608300001` through `202608300004` migrations must be deployed together, in order.
They tighten table grants and RLS, replace the request/payment submission contracts, add
workflow state machines, add payment idempotency, lock submitted attachments, and expose the
vendor directory through bounded RPCs.

Before applying them to production:

1. Back up the database and confirm the deployed migration history matches this repository.
2. Apply all four migrations in a staging project first.
3. Run role-based tests for requester, procurement, finance, executive, and admin accounts.
4. Deploy the application code and migrations in the same release. Older application code will
   not know the new payment idempotency parameter.

Document objects in the `procurement-documents` bucket must use one of these path formats:

```text
requests/<procurement-request-uuid>/<generated-file-name>
payments/<payment-request-uuid>/<generated-file-name>
```

Update/delete access is allowed only while the related request is `draft` or `returned`. After
submission, the file is immutable and a replacement must be stored as a new version.

## Create the first administrator

1. Create a user in Dashboard → Authentication → Users.
2. The `on_auth_user_created` trigger creates the matching profile automatically.
3. Run this once in SQL Editor, replacing the email:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'admin@ubu.ac.th';
```

After the first admin signs in, later role changes should call the protected
`set_user_role` database function from an admin-only interface.

## Application roles

- `user`
- `procurement_staff`
- `finance_staff`
- `head_procurement`
- `deputy_secretary`
- `deputy_finance`
- `dean`
- `head_office`
- `admin`

All public application tables have RLS enabled. User metadata is not trusted for
authorization; policies read roles from `public.profiles` through private security-definer
helpers.
