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
