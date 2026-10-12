-- Migration: Enable Supabase Realtime Replication for Todos and Routines

-- Enable replica identity so UPDATE and DELETE events have full row data
alter table public.todos replica identity full;
alter table public.routines replica identity full;
alter table public.routine_checkins replica identity full;

-- Safely add tables to the supabase_realtime publication if not already present
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.todos;
    exception when duplicate_object then
      null;
    end;

    begin
      alter publication supabase_realtime add table public.routines;
    exception when duplicate_object then
      null;
    end;

    begin
      alter publication supabase_realtime add table public.routine_checkins;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;
