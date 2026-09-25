# Supabase migrations

Once a Supabase project exists, link this repository and apply the versioned migrations:

```sh
supabase link
supabase db push
```

After the intended administrator has signed in once (so the `profiles` trigger has created their row), assign that role manually:

```sql
update profiles set role = 'admin' where id = '<uuid>';
```
