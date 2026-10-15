-- Migration: Add tasks jsonb column to daily_recaps for archiving yesterday's tasks
alter table public.daily_recaps
add column if not exists tasks jsonb not null default '[]'::jsonb;

-- Add delete policy for daily_recaps so spaces can prune old recaps
create policy "daily_recaps_delete_member"
on public.daily_recaps
for delete
using (
  exists (
    select 1 from public.spaces s
    where s.id = daily_recaps.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);
