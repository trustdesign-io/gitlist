-- GitHub accounts table
-- Stores the GitHub PAT for each user, protected by RLS.
-- The PAT is only readable/writable by the owning user via the anon key.

create table if not exists github_accounts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  github_username text not null,
  github_pat   text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
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
