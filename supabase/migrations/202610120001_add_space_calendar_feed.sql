-- Migration: Add calendar_feed_url to Spaces and allow partners to update their Space

alter table public.spaces add column if not exists calendar_feed_url text;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'spaces' and policyname = 'partners can update their Space'
  ) then
    create policy "partners can update their Space"
    on public.spaces for update to authenticated
    using (user_1 = (select auth.uid()) or user_2 = (select auth.uid()))
    with check (user_1 = (select auth.uid()) or user_2 = (select auth.uid()));
  end if;
end;
$$;
