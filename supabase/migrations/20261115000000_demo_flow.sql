-- Demo flow: turn proposed ideas into member polls and let organizers schedule winners.

alter table public.ideas add column address text not null default '';

alter table public.itinerary_items
  add column address text not null default '',
  add column price text not null default '',
  add column added_by uuid references public.profiles (id),
  add column source_poll_id uuid references public.polls (id) on delete set null;

alter table public.polls
  add column resolved_at timestamptz,
  add column winning_option_id uuid;

alter table public.poll_options add column is_skip boolean not null default false;

-- A poll can produce at most one itinerary item. Preserve any pre-existing data.
create unique index itinerary_items_source_poll_id_key
  on public.itinerary_items (source_poll_id) where source_poll_id is not null;

-- Bind the winning option to its poll, preventing cross-poll winners.
alter table public.poll_options add constraint poll_options_id_poll_id_key unique (id, poll_id);

-- Keep historical rows intact while enforcing this relationship for all new writes.
alter table public.votes add constraint votes_option_same_poll_fk
  foreign key (option_id, poll_id) references public.poll_options (id, poll_id) on delete cascade not valid;

-- Rebuild propose_idea with a poll id return value. Locking the idea makes concurrent proposals
-- converge on the same poll rather than creating duplicate votes.
drop function public.propose_idea(uuid);
create function public.propose_idea(p_idea_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idea public.ideas%rowtype;
  v_poll_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into v_idea from public.ideas where id = p_idea_id for update;
  if not found or not public.is_trip_member(v_idea.trip_id) then
    raise exception 'Idea not found or not a trip member';
  end if;

  if v_idea.status in ('proposed', 'poll') then
    select p.id into v_poll_id
    from public.polls p
    join public.poll_options o on o.poll_id = p.id and o.idea_id = v_idea.id
    where p.trip_id = v_idea.trip_id
    order by p.created_at desc limit 1;
    if v_poll_id is not null then return v_poll_id; end if;
  end if;
  if v_idea.status not in ('open', 'proposed') then
    raise exception 'Idea cannot be proposed in its current state';
  end if;

  update public.ideas set status = 'poll' where id = v_idea.id;
  insert into public.polls (trip_id, question, created_by, closes_at)
  values (v_idea.trip_id, 'Should we add ' || v_idea.title || ' to the itinerary?', auth.uid(), now() + interval '3 days')
  returning id into v_poll_id;

  insert into public.poll_options (poll_id, idea_id, title, category, area, subtitle, position, is_skip)
  values
    (v_poll_id, v_idea.id, v_idea.title, v_idea.category, coalesce(v_idea.address, ''), v_idea.price, 0, false),
    (v_poll_id, null, 'Skip this idea', v_idea.category, '', 'Do not schedule this idea', 1, true);
  return v_poll_id;
end;
$$;

-- Voting and resolving both lock the poll row. The trigger closes the race where a vote starts
-- while the organizer is resolving a poll; after resolution, no additional vote can be committed.
create function public.guard_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
  v_closes_at timestamptz;
  v_resolved_at timestamptz;
begin
  if tg_op = 'UPDATE' and (new.poll_id <> old.poll_id or new.user_id <> old.user_id) then
    raise exception 'Vote identity cannot be changed';
  end if;
  select p.trip_id, p.closes_at, p.resolved_at into v_trip_id, v_closes_at, v_resolved_at
  from public.polls p where p.id = new.poll_id for update;
  if not found or v_closes_at <= now() or v_resolved_at is not null then raise exception 'Poll is closed'; end if;
  if not public.is_trip_member(v_trip_id) or new.user_id <> auth.uid() then
    raise exception 'Not authorized to vote';
  end if;
  if not exists (select 1 from public.poll_options o where o.id = new.option_id and o.poll_id = new.poll_id) then
    raise exception 'Option does not belong to poll';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger votes_guard_poll_vote
  before insert or update on public.votes
  for each row execute function public.guard_poll_vote();

create function public.guard_poll_vote_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closes_at timestamptz;
  v_resolved_at timestamptz;
begin
  -- Permit FK cascades when a poll/option is administratively removed.
  if pg_trigger_depth() > 1 then return old; end if;
  select p.closes_at, p.resolved_at into v_closes_at, v_resolved_at
  from public.polls p where p.id = old.poll_id for update;
  if found and (v_closes_at <= now() or v_resolved_at is not null) then
    raise exception 'Votes cannot be removed from a closed poll';
  end if;
  return old;
end;
$$;

create trigger votes_guard_poll_vote_delete
  before delete on public.votes
  for each row execute function public.guard_poll_vote_delete();

-- The resolver accepts an explicit organizer choice among tied highest-vote options. It can close
-- an active poll early, but cannot manufacture a winner with zero votes.
create function public.resolve_poll(
  p_poll_id uuid,
  p_option_id uuid,
  p_day integer,
  p_start time,
  p_end time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
  v_option public.poll_options%rowtype;
  v_votes bigint;
  v_top_votes bigint;
  v_trip_start date;
  v_trip_end date;
  v_idea public.ideas%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then raise exception 'Poll not found'; end if;
  if not public.is_trip_organizer(v_poll.trip_id) then raise exception 'Organizer access required'; end if;
  if v_poll.resolved_at is not null then raise exception 'Poll already resolved'; end if;

  select * into v_option from public.poll_options
  where id = p_option_id and poll_id = p_poll_id;
  if not found then raise exception 'Option does not belong to poll'; end if;
  select count(*) into v_votes
  from public.votes v join public.trip_members m on m.trip_id = v_poll.trip_id and m.user_id = v.user_id
  where v.poll_id = p_poll_id and v.option_id = p_option_id;
  select coalesce(max(option_votes), 0) into v_top_votes from (
    select count(v.user_id) as option_votes
    from public.poll_options o left join public.votes v on v.poll_id = o.poll_id and v.option_id = o.id
      and exists (select 1 from public.trip_members m where m.trip_id = v_poll.trip_id and m.user_id = v.user_id)
    where o.poll_id = p_poll_id group by o.id
  ) counts;
  if v_votes = 0 or v_votes <> v_top_votes then raise exception 'Winner must have a positive highest vote count'; end if;

  if v_option.is_skip then
    if v_option.idea_id is not null then raise exception 'Skip option cannot reference an idea'; end if;
    update public.ideas set status = 'open'
      where id in (select o.idea_id from public.poll_options o where o.poll_id = p_poll_id and o.idea_id is not null)
        and status = 'poll';
    update public.polls set winning_option_id = p_option_id, resolved_at = now() where id = p_poll_id;
    return;
  end if;
  if p_day is null or p_start is null or p_end is null or p_day < 1 or p_end <= p_start then
    raise exception 'A valid itinerary day and time range are required';
  end if;
  select start_date, end_date into v_trip_start, v_trip_end from public.trips where id = v_poll.trip_id;
  if p_day > (v_trip_end - v_trip_start + 1) then raise exception 'Day is outside the trip'; end if;
  if v_option.idea_id is null then raise exception 'Winning option has no idea'; end if;
  select * into v_idea from public.ideas where id = v_option.idea_id and trip_id = v_poll.trip_id for update;
  if not found then raise exception 'Winning idea not found in this trip'; end if;

  insert into public.itinerary_days (trip_id, day, title)
  values (v_poll.trip_id, p_day, 'Day ' || p_day)
  on conflict (trip_id, day) do nothing;
  insert into public.itinerary_items (
    trip_id, day, position, start_time, end_time, status, title, stop_label, category, meta,
    address, price, added_by, source_poll_id
  ) values (
    v_poll.trip_id, p_day,
    coalesce((select max(position) + 1 from public.itinerary_items where trip_id = v_poll.trip_id and day = p_day), 0),
    p_start, p_end, 'confirmed', v_idea.title, v_idea.title, v_idea.category,
    concat_ws(' • ', nullif(v_idea.category, ''), nullif(v_idea.address, ''), nullif(v_idea.price, '')),
    v_idea.address, v_idea.price, v_idea.added_by, p_poll_id
  );

  update public.ideas set status = case when id = v_idea.id then 'confirmed' else 'open' end
  where id in (select o.idea_id from public.poll_options o where o.poll_id = p_poll_id and o.idea_id is not null)
    and status in ('poll', 'proposed');
  update public.polls set winning_option_id = p_option_id, resolved_at = now() where id = p_poll_id;
end;
$$;

-- Tighten membership and ownership checks. All relation columns are explicitly qualified.
drop policy "Change own vote" on public.votes;
create policy "Change own vote" on public.votes for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.polls p where p.id = votes.poll_id and public.is_trip_member(p.trip_id)
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.polls p join public.poll_options o on o.poll_id = p.id
    where p.id = votes.poll_id and o.id = votes.option_id and p.closes_at > now()
      and public.is_trip_member(p.trip_id)
  ));
drop policy "Cast own vote" on public.votes;
create policy "Cast own vote" on public.votes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.polls p join public.poll_options o on o.poll_id = p.id
    where p.id = votes.poll_id and o.id = votes.option_id
      and p.closes_at > now() and public.is_trip_member(p.trip_id)
  ));

-- Re-entering an invite code refreshes the membership timestamp without demoting organizers.
create or replace function public.join_trip(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_trip_id from public.trips
  where invite_code = upper(trim(p_invite_code));
  if v_trip_id is null then raise exception 'No trip found for that invite code'; end if;
  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do update set joined_at = now();
  return v_trip_id;
end;
$$;

revoke execute on function public.propose_idea(uuid) from public, anon;
grant execute on function public.propose_idea(uuid) to authenticated;
revoke execute on function public.resolve_poll(uuid, uuid, integer, time, time) from public, anon;
grant execute on function public.resolve_poll(uuid, uuid, integer, time, time) to authenticated;
revoke execute on function public.guard_poll_vote() from public, anon, authenticated;
revoke execute on function public.guard_poll_vote_delete() from public, anon, authenticated;

alter publication supabase_realtime
  add table public.polls, public.poll_options, public.itinerary_days, public.itinerary_items;
