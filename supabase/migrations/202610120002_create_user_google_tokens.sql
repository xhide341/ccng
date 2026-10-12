-- Create table for storing user Google OAuth tokens for Google Calendar API access
create table if not exists public.user_google_tokens (
  user_id uuid references auth.users(id) on delete cascade primary key,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.user_google_tokens enable row level security;

create policy "Users can view and update their own Google tokens"
  on public.user_google_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
