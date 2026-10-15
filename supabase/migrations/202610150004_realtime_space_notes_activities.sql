-- Migration: Enable Realtime for space_notes and activities, and standardize RLS policies

-- Ensure replica identity full so UPDATE and DELETE events include full row data
alter table public.space_notes replica identity full;
alter table public.activities replica identity full;

-- Safely add tables to supabase_realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.space_notes;
    exception when duplicate_object then
      null;
    end;

    begin
      alter publication supabase_realtime add table public.activities;
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

-- Align space_notes RLS policies with private.is_space_partner(space_id) security definer
drop policy if exists "space_notes_select_member" on public.space_notes;
create policy "space_notes_select_member"
on public.space_notes
for select
to authenticated
using ((select private.is_space_partner(space_id)));

drop policy if exists "space_notes_insert_member" on public.space_notes;
create policy "space_notes_insert_member"
on public.space_notes
for insert
to authenticated
with check ((select private.is_space_partner(space_id)));

drop policy if exists "space_notes_update_member" on public.space_notes;
create policy "space_notes_update_member"
on public.space_notes
for update
to authenticated
using ((select private.is_space_partner(space_id)))
with check ((select private.is_space_partner(space_id)));

drop policy if exists "space_notes_delete_member" on public.space_notes;
create policy "space_notes_delete_member"
on public.space_notes
for delete
to authenticated
using ((select private.is_space_partner(space_id)));
