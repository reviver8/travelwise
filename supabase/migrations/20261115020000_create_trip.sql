-- Custom trip creation. The SECURITY DEFINER RPC returns the new ID even before the
-- AFTER INSERT trigger creates the creator membership row used by the read policy.

create or replace function public.create_trip(
  p_name text,
  p_destination text,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Trip name is required'; end if;
  if nullif(btrim(p_destination), '') is null then raise exception 'Destination is required'; end if;
  if p_start_date is null or p_end_date is null then raise exception 'Trip dates are required'; end if;
  if p_end_date < p_start_date then raise exception 'End date must be on or after start date'; end if;

  insert into public.trips (name, destination, start_date, end_date, created_by)
  values (btrim(p_name), btrim(p_destination), p_start_date, p_end_date, auth.uid())
  returning id into v_trip_id;
  -- The existing on_trip_created trigger adds the caller as organizer.
  return v_trip_id;
end;
$$;

revoke execute on function public.create_trip(text, text, date, date) from public, anon;
grant execute on function public.create_trip(text, text, date, date) to authenticated;
