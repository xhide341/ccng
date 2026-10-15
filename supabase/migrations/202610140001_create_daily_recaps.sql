-- Migration: Create daily_recaps table for caching daily AI summaries

create table if not exists public.daily_recaps (
  space_id uuid not null references public.spaces(id) on delete cascade,
  recap_date date not null default current_date,
  summary text not null,
  completed_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (space_id, recap_date)
);

-- Enable RLS
alter table public.daily_recaps enable row level security;

-- Policies for space members
create policy "daily_recaps_select_member"
on public.daily_recaps
for select
using (
  exists (
    select 1 from public.spaces s
    where s.id = daily_recaps.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

create policy "daily_recaps_insert_member"
on public.daily_recaps
for insert
with check (
  exists (
    select 1 from public.spaces s
    where s.id = daily_recaps.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

create policy "daily_recaps_update_member"
on public.daily_recaps
for update
using (
  exists (
    select 1 from public.spaces s
    where s.id = daily_recaps.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.spaces s
    where s.id = daily_recaps.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);
