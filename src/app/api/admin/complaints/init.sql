create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table complaints enable row level security;
-- Users can only see their own complaints
create policy "users view own complaints" on complaints for select using (auth.uid() = user_id);
create policy "users insert own complaints" on complaints for insert with check (auth.uid() = user_id);
-- Admin (service role) has full access via admin client
