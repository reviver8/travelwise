-- Allow organizers to cancel an unresolved poll while retaining its votes and options.
alter table public.polls add column cancelled_at timestamptz;

create function public.cancel_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  -- Share the poll lock used by voting and resolution so cancellation cannot race either.
  select * into v_poll
  from public.polls
  where id = p_poll_id
  for update;
  if not found then raise exception 'Poll not found'; end if;
  if not public.is_trip_organizer(v_poll.trip_id) then
    raise exception 'Organizer access required';
  end if;

  -- A retry of a successful cancellation is harmless; a completed vote resolution is final.
  if v_poll.cancelled_at is not null then return; end if;
  if v_poll.resolved_at is not null then raise exception 'Poll already resolved'; end if;

  update public.polls
  set resolved_at = now(), cancelled_at = now()
  where id = p_poll_id;

  -- Only reopen linked ideas that are not still held by another unresolved poll.
  update public.ideas i
  set status = 'open'
  where i.id in (
    select o.idea_id
    from public.poll_options o
    where o.poll_id = p_poll_id and o.idea_id is not null
  )
    and i.status in ('poll', 'proposed')
    and not exists (
      select 1
      from public.poll_options other_o
      join public.polls other_p on other_p.id = other_o.poll_id
      where other_o.idea_id = i.id
        and other_p.id <> p_poll_id
        and other_p.resolved_at is null
    );
end;
$$;

revoke execute on function public.cancel_poll(uuid) from public, anon;
grant execute on function public.cancel_poll(uuid) to authenticated;

-- Serialize confirmed schedule writes per trip before checking half-open time ranges.
-- Existing overlaps remain untouched; only new or updated confirmed rows are checked.
create function public.guard_confirmed_itinerary_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conflict_title text;
  v_excluded_item_id uuid;
begin
  if new.status <> 'confirmed' then return new; end if;
  if new.end_time <= new.start_time then
    raise exception 'End time must be after start time';
  end if;

  -- The trip row is a stable serialization point for all schedules within this trip.
  perform 1
  from public.trips t
  where t.id = new.trip_id
  for no key update;

  if tg_op = 'UPDATE' then
    v_excluded_item_id := old.id;
  end if;

  select existing.title into v_conflict_title
  from public.itinerary_items existing
  where existing.trip_id = new.trip_id
    and existing.day = new.day
    and existing.status = 'confirmed'
    and existing.start_time < new.end_time
    and new.start_time < existing.end_time
    and (v_excluded_item_id is null or existing.id <> v_excluded_item_id)
  order by existing.start_time, existing.position, existing.id
  limit 1;

  if v_conflict_title is not null then
    raise exception 'Schedule overlaps with "%"', v_conflict_title;
  end if;
  return new;
end;
$$;

create trigger itinerary_items_guard_confirmed_overlap
  before insert or update on public.itinerary_items
  for each row execute function public.guard_confirmed_itinerary_overlap();

revoke execute on function public.guard_confirmed_itinerary_overlap() from public, anon, authenticated;
