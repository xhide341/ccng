-- Secure user_google_tokens table with restrictive RLS policies and server-side access controls

-- Enable and force row level security
alter table public.user_google_tokens enable row level security;
alter table public.user_google_tokens force row level security;

-- Drop existing broad policy
drop policy if exists "Users can view and update their own Google tokens" on public.user_google_tokens;
drop policy if exists "authenticated_users_select_own_tokens" on public.user_google_tokens;
drop policy if exists "authenticated_users_insert_own_tokens" on public.user_google_tokens;
drop policy if exists "authenticated_users_update_own_tokens" on public.user_google_tokens;
drop policy if exists "authenticated_users_delete_own_tokens" on public.user_google_tokens;

-- Revoke all direct privileges from anonymous and public roles
revoke all on table public.user_google_tokens from anon, public;

-- Grant operations to authenticated users and service_role
grant select, insert, update, delete on table public.user_google_tokens to authenticated;
grant all on table public.user_google_tokens to service_role;

-- Granular RLS policies using cached (select auth.uid()) for optimal performance and tenant isolation
create policy "authenticated_users_select_own_tokens"
  on public.user_google_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated_users_insert_own_tokens"
  on public.user_google_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated_users_update_own_tokens"
  on public.user_google_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "authenticated_users_delete_own_tokens"
  on public.user_google_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
