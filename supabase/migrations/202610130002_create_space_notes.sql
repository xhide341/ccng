-- Migration: Create space_notes table and expand activities kind check

create table if not exists public.space_notes (
  space_id uuid primary key references public.spaces(id) on delete cascade,
  content text not null default '',
  author_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.space_notes enable row level security;

-- Policies for space_notes: space members can select, insert, update, delete
create policy "space_notes_select_member"
on public.space_notes
for select
using (
  exists (
    select 1 from public.spaces s
    where s.id = space_notes.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

create policy "space_notes_insert_member"
on public.space_notes
for insert
with check (
  exists (
    select 1 from public.spaces s
    where s.id = space_notes.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

create policy "space_notes_update_member"
on public.space_notes
for update
using (
  exists (
    select 1 from public.spaces s
    where s.id = space_notes.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.spaces s
    where s.id = space_notes.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

create policy "space_notes_delete_member"
on public.space_notes
for delete
using (
  exists (
    select 1 from public.spaces s
    where s.id = space_notes.space_id
      and (s.user_1 = auth.uid() or s.user_2 = auth.uid())
  )
);

-- Enable replica identity full for real-time replication
alter table public.space_notes replica identity full;

-- Safely add space_notes to supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.space_notes;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

-- Expand activities kind check constraint to include note_updated
alter table public.activities drop constraint if exists activities_kind_check;

alter table public.activities add constraint activities_kind_check check (
  kind in (
    'todo_created',
    'todo_updated',
    'todo_completed',
    'todo_uncompleted',
    'todo_deleted',
    'calendar_created',
    'calendar_updated',
    'calendar_deleted',
    'pairing_redeemed',
    'note_updated'
  )
);
