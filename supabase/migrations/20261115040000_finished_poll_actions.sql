-- Keep the poll record so its confirmed stop retains its source and members
-- receive the removal through the existing trip-scoped Realtime UPDATE.
alter table public.polls add column deleted_at timestamptz;

create function public.close_poll_voting(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then raise exception 'Poll not found'; end if;
  if not public.is_trip_organizer(v_poll.trip_id) then
    raise exception 'Organizer access required';
  end if;

  if v_poll.resolved_at is not null or v_poll.closes_at <= clock_timestamp() then return; end if;
  update public.polls set closes_at = clock_timestamp() where id = p_poll_id;
end;
$$;

create function public.delete_finished_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then raise exception 'Poll not found'; end if;
  if not public.is_trip_organizer(v_poll.trip_id) then
    raise exception 'Organizer access required';
  end if;

  if v_poll.deleted_at is not null then return; end if;
  if v_poll.resolved_at is null then
    if v_poll.closes_at > clock_timestamp() then
      raise exception 'Close voting before deleting this poll';
    end if;
    -- Return ideas from an unresolved vote to the Ideas list.
    perform public.cancel_poll(p_poll_id);
  end if;

  update public.polls set deleted_at = clock_timestamp() where id = p_poll_id;
end;
$$;

revoke execute on function public.close_poll_voting(uuid) from public, anon;
grant execute on function public.close_poll_voting(uuid) to authenticated;
revoke execute on function public.delete_finished_poll(uuid) from public, anon;
grant execute on function public.delete_finished_poll(uuid) to authenticated;

-- Compare against the time after obtaining the poll lock. An in-flight vote
-- may have started its transaction before the organizer closed voting.
create or replace function public.guard_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
begin
  if tg_op = 'UPDATE' and (new.poll_id <> old.poll_id or new.user_id <> old.user_id) then
    raise exception 'Vote identity cannot be changed';
  end if;
  select * into v_poll from public.polls where id = new.poll_id for update;
  if not found or v_poll.closes_at <= clock_timestamp() or v_poll.resolved_at is not null then
    raise exception 'Poll is closed';
  end if;
  if not public.is_trip_member(v_poll.trip_id) or new.user_id <> auth.uid() then
    raise exception 'Not authorized to vote';
  end if;
  if not exists (select 1 from public.poll_options o where o.id = new.option_id and o.poll_id = new.poll_id) then
    raise exception 'Option does not belong to poll';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_poll_vote_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll public.polls%rowtype;
begin
  -- Permit foreign-key cascades when a poll or option is administratively removed.
  if pg_trigger_depth() > 1 then return old; end if;
  select * into v_poll from public.polls where id = old.poll_id for update;
  if found and (v_poll.closes_at <= clock_timestamp() or v_poll.resolved_at is not null) then
    raise exception 'Votes cannot be removed from a closed poll';
  end if;
  return old;
end;
$$;
