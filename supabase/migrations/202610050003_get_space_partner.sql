-- Migration: Add secure RPC to retrieve partner profile in a shared Space

create or replace function public.get_space_partner(p_space_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := (select auth.uid());
  partner_id uuid;
  partner_info jsonb;
begin
  if current_user_id is null then
    return null;
  end if;

  -- Ensure the caller is a member of this space and find the partner ID
  select case
    when user_1 = current_user_id then user_2
    when user_2 = current_user_id then user_1
    else null
  end into partner_id
  from public.spaces
  where id = p_space_id
    and (user_1 = current_user_id or user_2 = current_user_id);

  -- If the user is not in the space or there is no partner yet (solo)
  if partner_id is null then
    return null;
  end if;

  -- Extract display name and details from auth.users metadata
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'display_name', coalesce(
      nullif(trim(u.raw_user_meta_data->>'given_name'), ''),
      nullif(trim(split_part(u.raw_user_meta_data->>'full_name', ' ', 1)), ''),
      nullif(trim(split_part(u.email, '@', 1)), ''),
      'Partner'
    )
  ) into partner_info
  from auth.users u
  where u.id = partner_id;

  return partner_info;
end;
$$;

revoke all on function public.get_space_partner(uuid) from public;
grant execute on function public.get_space_partner(uuid) to authenticated;
