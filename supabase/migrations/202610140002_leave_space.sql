-- Migration: Add leave_space RPC for partners and solo creators

create or replace function public.leave_space()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  user_space record;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id, user_1, user_2 into user_space
  from public.spaces
  where user_1 = current_user_id or user_2 = current_user_id
  limit 1;

  if user_space.id is null then
    return;
  end if;

  if user_space.user_2 = current_user_id then
    -- Partner is leaving: unlink partner
    update public.spaces
    set user_2 = null
    where id = user_space.id;

    -- Clean up user_2's active pairing codes if any
    delete from public.pairing_codes
    where space_id = user_space.id and created_by = current_user_id;

    -- Clean up user google tokens if any
    delete from public.user_google_tokens
    where user_id = current_user_id;

  elsif user_space.user_1 = current_user_id then
    if user_space.user_2 is not null then
      -- Creator is leaving, but partner exists: promote partner to user_1
      update public.spaces
      set user_1 = user_space.user_2,
          user_2 = null
      where id = user_space.id;

      -- Clean up user_1's pairing codes
      delete from public.pairing_codes
      where space_id = user_space.id and created_by = current_user_id;

      -- Clean up user google tokens
      delete from public.user_google_tokens
      where user_id = current_user_id;
    else
      -- Solo creator is leaving: delete space (cascades to todos, notes, etc.)
      delete from public.spaces
      where id = user_space.id;

      delete from public.user_google_tokens
      where user_id = current_user_id;
    end if;
  end if;
end;
$$;

grant execute on function public.leave_space to authenticated;
