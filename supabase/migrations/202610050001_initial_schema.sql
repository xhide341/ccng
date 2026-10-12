create extension if not exists pgcrypto;

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_1 uuid not null references auth.users(id) on delete cascade,
  user_2 uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint spaces_distinct_users check (user_2 is null or user_1 <> user_2)
);

create unique index spaces_user_1_unique on public.spaces (user_1);
create unique index spaces_user_2_unique on public.spaces (user_2) where user_2 is not null;

create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index pairing_codes_space_id_idx on public.pairing_codes (space_id);
create index pairing_codes_created_by_idx on public.pairing_codes (created_by);
create index pairing_codes_active_idx on public.pairing_codes (space_id, created_at desc) where redeemed_at is null;

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  tag text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  priority boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_space_id_updated_at_idx on public.todos (space_id, updated_at desc);
create index todos_assignee_user_id_idx on public.todos (assignee_user_id);
create index todos_created_by_idx on public.todos (created_by);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  detail text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_checkins (
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (routine_id, user_id, check_date)
);

create index routine_checkins_user_id_idx on public.routine_checkins (user_id);

create index routines_space_id_idx on public.routines (space_id);
create index routines_assignee_user_id_idx on public.routines (assignee_user_id);
create index routines_created_by_idx on public.routines (created_by);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('todo_created', 'todo_updated', 'routine_checked', 'pairing_redeemed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activities_space_id_created_at_idx on public.activities (space_id, created_at desc);
create index activities_actor_id_idx on public.activities (actor_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger todos_set_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

create trigger routines_set_updated_at
before update on public.routines
for each row execute function public.set_updated_at();

create schema if not exists private;

create or replace function private.is_space_partner(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.spaces
    where id = p_space_id
      and (user_1 = (select auth.uid()) or user_2 = (select auth.uid()))
  );
$$;

create or replace function public.create_space()
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_space_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.spaces (user_1)
  values ((select auth.uid()))
  returning id into new_space_id;

  return new_space_id;
end;
$$;

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

alter table public.spaces enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.todos enable row level security;
alter table public.routines enable row level security;
alter table public.routine_checkins enable row level security;
alter table public.activities enable row level security;

create policy "partners can view their Space"
on public.spaces for select to authenticated
using (user_1 = (select auth.uid()) or user_2 = (select auth.uid()));

create policy "users can create their Space"
on public.spaces for insert to authenticated
with check (user_1 = (select auth.uid()) and user_2 is null);

create policy "partners can create pairing codes"
on public.pairing_codes for insert to authenticated
with check (
  (select private.is_space_partner(space_id))
  and created_by = (select auth.uid())
);

create policy "partners can view pairing codes"
on public.pairing_codes for select to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can view Todos"
on public.todos for select to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can create Todos"
on public.todos for insert to authenticated
with check (
  (select private.is_space_partner(space_id))
  and created_by = (select auth.uid())
);

create policy "partners can update Todos"
on public.todos for update to authenticated
using ((select private.is_space_partner(space_id)))
with check ((select private.is_space_partner(space_id)));

create policy "partners can delete Todos"
on public.todos for delete to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can view Routines"
on public.routines for select to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can create Routines"
on public.routines for insert to authenticated
with check (
  (select private.is_space_partner(space_id))
  and created_by = (select auth.uid())
);

create policy "partners can update Routines"
on public.routines for update to authenticated
using ((select private.is_space_partner(space_id)))
with check ((select private.is_space_partner(space_id)));

create policy "partners can delete Routines"
on public.routines for delete to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can view Routine checkins"
on public.routine_checkins for select to authenticated
using (
  exists (
    select 1 from public.routines
    where routines.id = routine_checkins.routine_id
      and (select private.is_space_partner(routines.space_id))
  )
);

create policy "partners can manage their Routine checkins"
on public.routine_checkins for all to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routines
    where routines.id = routine_checkins.routine_id
      and (select private.is_space_partner(routines.space_id))
  )
);

create policy "partners can view Activity"
on public.activities for select to authenticated
using ((select private.is_space_partner(space_id)));

create policy "partners can create Activity"
on public.activities for insert to authenticated
with check (
  (select private.is_space_partner(space_id))
  and actor_id = (select auth.uid())
);

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on function private.is_space_partner(uuid) from public, anon;
grant execute on function private.is_space_partner(uuid) to authenticated;
revoke execute on function public.create_space() from public, anon;
revoke execute on function public.create_pairing_code(text, timestamptz) from public, anon;
revoke execute on function public.redeem_pairing_code(text) from public, anon;

grant execute on function public.create_space() to authenticated;
grant execute on function public.create_pairing_code(text, timestamptz) to authenticated;
grant execute on function public.redeem_pairing_code(text) to authenticated;
