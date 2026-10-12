-- Migration: Expand activities kind check constraint and enable realtime

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
    'pairing_redeemed'
  )
);

-- Enable replica identity full for real-time replication
alter table public.activities replica identity full;

-- Safely add activities to supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.activities;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;
