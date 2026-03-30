-- GitHub accounts table
-- The PAT is stored encrypted at rest using pgp_sym_encrypt.
-- Production setup: run the following in your Supabase SQL editor to set the key:
--   ALTER DATABASE postgres SET app.pat_key = 'your-strong-random-secret-here';
-- The key can also be set via Supabase Vault (recommended for production).

create extension if not exists pgcrypto;

create table if not exists github_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  github_username  text not null,
  -- PAT stored as pgp_sym_encrypted bytea via RPC functions below
  github_pat       bytea not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint github_accounts_user_id_key unique (user_id)
);

-- Only the owner can select, insert, update, or delete their own row
alter table github_accounts enable row level security;

create policy "Users can read their own github account"
  on github_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own github account"
  on github_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own github account"
  on github_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own github account"
  on github_accounts for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- RPC: store_github_pat
-- Encrypts the PAT before upsert. Called from the mobile client.
-- ----------------------------------------------------------------
create or replace function store_github_pat(p_username text, p_pat text)
returns void
language plpgsql security definer as $$
declare
  v_key text := coalesce(nullif(current_setting('app.pat_key', true), ''), 'change-me-in-production');
begin
  insert into github_accounts (user_id, github_username, github_pat)
  values (
    auth.uid(),
    p_username,
    pgp_sym_encrypt(p_pat, v_key)
  )
  on conflict (user_id) do update
    set github_username = excluded.github_username,
        github_pat      = excluded.github_pat,
        updated_at      = now();
end;
$$;

-- ----------------------------------------------------------------
-- RPC: get_github_pat
-- Decrypts and returns the PAT for the authenticated user.
-- ----------------------------------------------------------------
create or replace function get_github_pat()
returns table(github_username text, github_pat text)
language plpgsql security definer as $$
declare
  v_key text := coalesce(nullif(current_setting('app.pat_key', true), ''), 'change-me-in-production');
begin
  return query
    select
      ga.github_username,
      pgp_sym_decrypt(ga.github_pat, v_key)
    from github_accounts ga
    where ga.user_id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------
-- RPC: delete_github_pat
-- Removes the authenticated user's GitHub account row.
-- ----------------------------------------------------------------
create or replace function delete_github_pat()
returns void
language plpgsql security definer as $$
begin
  delete from github_accounts where user_id = auth.uid();
end;
$$;
