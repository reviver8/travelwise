-- Create a single poll with several idea options. Locking the ideas in a stable order
-- serializes this RPC with propose_idea and with other polls sharing an idea.
create function public.create_poll(p_trip_id uuid, p_question text, p_idea_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question text := trim(p_question);
  v_poll_id uuid;
  v_count integer;
  v_distinct_count integer;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if v_question is null or length(v_question) < 1 or length(v_question) > 160 then
    raise exception 'Question must be between 1 and 160 characters';
  end if;
  if p_idea_ids is null then raise exception 'Choose between 2 and 8 ideas'; end if;

  v_count := cardinality(p_idea_ids);
  select count(distinct selected.idea_id) into v_distinct_count
  from unnest(p_idea_ids) as selected(idea_id);
  if v_count < 2 or v_count > 8 or v_distinct_count <> v_count then
    raise exception 'Choose between 2 and 8 distinct ideas';
  end if;
  if not public.is_trip_member(p_trip_id) then raise exception 'Trip member access required'; end if;

  -- Lock in id order to avoid deadlocks with another multi-idea create request.
  perform i.id
  from public.ideas i
  where i.trip_id = p_trip_id and i.id = any(p_idea_ids)
  order by i.id
  for update;

  -- Validate the complete selection after acquiring all locks and before writing anything.
  if (
    select count(*) from public.ideas i where i.trip_id = p_trip_id and i.id = any(p_idea_ids)
  ) <> v_count then
    raise exception 'All ideas must belong to this trip';
  end if;
  if exists (
    select 1 from public.ideas i
    where i.id = any(p_idea_ids)
      and i.status not in ('open', 'proposed')
  ) then
    raise exception 'Choose ideas that are not scheduled or already in a poll';
  end if;
  if exists (
    select 1
    from public.poll_options o
    join public.polls p on p.id = o.poll_id
    where o.idea_id = any(p_idea_ids) and p.resolved_at is null
  ) then
    raise exception 'An idea is already linked to an unresolved poll';
  end if;

  insert into public.polls (trip_id, question, created_by, closes_at)
  values (p_trip_id, v_question, auth.uid(), now() + interval '3 days')
  returning id into v_poll_id;

  insert into public.poll_options (poll_id, idea_id, title, category, area, subtitle, position)
    select v_poll_id, i.id, i.title, i.category, i.address, i.price, selected.ordinality::integer - 1
    from unnest(p_idea_ids) with ordinality as selected(idea_id, ordinality)
    join public.ideas i on i.id = selected.idea_id;

  update public.ideas set status = 'poll' where id = any(p_idea_ids);
  return v_poll_id;
end;
$$;

revoke execute on function public.create_poll(uuid, text, uuid[]) from public, anon;
grant execute on function public.create_poll(uuid, text, uuid[]) to authenticated;
