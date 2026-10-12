-- Migration: Store plain pairing code instead of hash, and allow space partners to view active codes

-- 1. Alter pairing_codes table
alter table public.pairing_codes 
  add column if not exists code text;

alter table public.pairing_codes 
  drop column if exists code_digest;

delete from public.pairing_codes where code is null;

alter table public.pairing_codes 
  alter column code set not null;

create unique index if not exists pairing_codes_code_unique on public.pairing_codes (code);
create index if not exists pairing_codes_active_idx on public.pairing_codes (space_id, created_at desc) where redeemed_at is null;

-- 2. Update create_pairing_code function
create or replace function public.create_pairing_code(
  p_code text,
  p_expires_at timestamptz default (now() + interval '7 days')
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  space_id uuid;
  pairing_code_id uuid;
  normalized_code text := upper(trim(p_code));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if normalized_code !~ '^[A-Z0-9-]{6,32}$' then
    raise exception 'Pairing Code must contain 6 to 32 letters, numbers, or hyphens';
  end if;

  select id into space_id
  from public.spaces
  where user_1 = (select auth.uid()) or user_2 = (select auth.uid())
  limit 1;

  if space_id is null then
    raise exception 'Space not found';
  end if;

  insert into public.pairing_codes (space_id, code, created_by, expires_at)
  values (
    space_id,
    normalized_code,
    (select auth.uid()),
    p_expires_at
  )
  returning id into pairing_code_id;

  return pairing_code_id;
end;
$$;

-- 3. Update redeem_pairing_code function
create or replace function public.redeem_pairing_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pairing_space_id uuid;
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(trim(p_code));
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.spaces
    where user_1 = current_user_id or user_2 = current_user_id
  ) then
    raise exception 'User already belongs to a Space';
  end if;

  select pairing_codes.space_id into pairing_space_id
  from public.pairing_codes
  join public.spaces on spaces.id = pairing_codes.space_id
  where pairing_codes.code = normalized_code
    and pairing_codes.redeemed_at is null
    and pairing_codes.expires_at > now()
    and spaces.user_2 is null
  for update of pairing_codes, spaces;

  if pairing_space_id is null then
    raise exception 'Pairing Code is invalid or expired';
  end if;

  update public.spaces
  set user_2 = current_user_id
  where id = pairing_space_id and user_2 is null;

  update public.pairing_codes
  set redeemed_at = now()
  where space_id = pairing_space_id
    and code = normalized_code
    and redeemed_at is null;

  insert into public.activities (space_id, actor_id, kind, payload)
  values (pairing_space_id, current_user_id, 'pairing_redeemed', '{}'::jsonb);

  return pairing_space_id;
end;
$$;

-- 4. Add SELECT policy so partners can view their active pairing code
drop policy if exists "partners can view pairing codes" on public.pairing_codes;
create policy "partners can view pairing codes"
on public.pairing_codes for select to authenticated
using ((select private.is_space_partner(space_id)));
