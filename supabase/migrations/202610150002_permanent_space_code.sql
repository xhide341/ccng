-- Migration: Add permanent code to spaces table and update create/redeem functions

-- 1. Helper function to generate 6-character uppercase alphanumeric code
create or replace function public.generate_space_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

-- 2. Alter spaces table to add code column
alter table public.spaces
  add column if not exists code text;

-- 3. Backfill existing spaces with latest pairing code or generated code
update public.spaces s
set code = coalesce(
  (
    select pc.code
    from public.pairing_codes pc
    where pc.space_id = s.id
    order by pc.created_at desc
    limit 1
  ),
  public.generate_space_code()
)
where s.code is null;

-- Ensure every existing space has a unique code
do $$
declare
  r record;
  candidate text;
begin
  for r in (
    select id from public.spaces
    where code is null
       or code in (select code from public.spaces group by code having count(*) > 1)
  ) loop
    loop
      candidate := public.generate_space_code();
      if not exists (select 1 from public.spaces where code = candidate) then
        update public.spaces set code = candidate where id = r.id;
        exit;
      end if;
    end loop;
  end loop;
end;
$$;

alter table public.spaces
  alter column code set not null;

create unique index if not exists spaces_code_unique on public.spaces (code);

-- 4. Update create_space function to generate and store permanent code
drop function if exists public.create_space();
create or replace function public.create_space()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_space_id uuid;
  new_code text;
  candidate text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.spaces
    where user_1 = auth.uid() or user_2 = auth.uid()
  ) then
    raise exception 'User already belongs to a Space';
  end if;

  loop
    candidate := public.generate_space_code();
    if not exists (select 1 from public.spaces where code = candidate) then
      new_code := candidate;
      exit;
    end if;
  end loop;

  insert into public.spaces (user_1, code)
  values (auth.uid(), new_code)
  returning id into new_space_id;

  -- Maintain pairing_codes row for backward compatibility
  insert into public.pairing_codes (space_id, code, created_by, expires_at)
  values (new_space_id, new_code, auth.uid(), now() + interval '365 days');

  return new_code;
end;
$$;

-- 5. Update redeem_pairing_code function to use spaces.code
create or replace function public.redeem_pairing_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pairing_space_id uuid;
  current_user_id uuid := auth.uid();
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

  select id into pairing_space_id
  from public.spaces
  where code = normalized_code
    and user_2 is null
  for update;

  if pairing_space_id is null then
    raise exception 'This code has already been redeemed or is invalid.';
  end if;

  update public.spaces
  set user_2 = current_user_id
  where id = pairing_space_id;

  -- Mark pairing code as redeemed if present
  update public.pairing_codes
  set redeemed_at = now()
  where space_id = pairing_space_id and redeemed_at is null;

  insert into public.activities (space_id, actor_id, kind, payload)
  values (pairing_space_id, current_user_id, 'pairing_redeemed', '{}'::jsonb);

  return pairing_space_id;
end;
$$;
