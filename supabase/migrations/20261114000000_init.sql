-- TravelWise initial schema.
--
-- Every table has row level security (RLS) on. The app ships with a publishable key, so these
-- policies are what keep one group's trip private from everyone else.

-- ---------------------------------------------------------------------------
-- Profiles: one row per signed-in user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- Create a profile automatically when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  palette text[] := array['#00796B', '#E8590C', '#2F6FED', '#2E9E6B', '#9C36B5', '#C2255C'];
  display_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    -- "grant.b@example.com" → "Grant B"
    initcap(regexp_replace(split_part(new.email, '@', 1), '[._-]+', ' ', 'g')),
    'Traveler'
  );
begin
  insert into public.profiles (id, name, color)
  values (new.id, display_name, palette[1 + floor(random() * array_length(palette, 1))::int]);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trips and membership
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_id_idx on public.trip_members (user_id);

-- Helpers used by policies. SECURITY DEFINER avoids policies on trip_members recursing into
-- themselves.
create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create function public.is_trip_organizer(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'organizer'
  );
$$;

-- Whoever creates a trip becomes its organizer.
create function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.created_by, 'organizer');
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- ---------------------------------------------------------------------------
-- Ideas
-- ---------------------------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  category text not null
    check (category in ('Food & Drink', 'Entertainment', 'Attractions', 'Shopping', 'Outdoors')),
  price text not null default '',
  description text not null default '' check (length(description) <= 280),
  status text not null default 'open' check (status in ('open', 'proposed', 'poll', 'confirmed')),
  added_by uuid not null default auth.uid() references public.profiles (id),
  -- Position on the placeholder map, in percent. Replace with real coordinates later.
  map_x real not null default (15 + random() * 70),
  map_y real not null default (15 + random() * 70),
  created_at timestamptz not null default now()
);

create index ideas_trip_id_idx on public.ideas (trip_id);

create table public.idea_likes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Polls
-- ---------------------------------------------------------------------------

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  question text not null,
  created_by uuid not null default auth.uid() references public.profiles (id),
  closes_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index polls_trip_id_idx on public.polls (trip_id);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  idea_id uuid references public.ideas (id) on delete set null,
  title text not null,
  category text not null,
  area text not null default '',
  subtitle text not null default '',
  position int not null default 0
);

create index poll_options_poll_id_idx on public.poll_options (poll_id);

-- One vote per person per poll. Changing your vote updates the row.
create table public.votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Itinerary
-- ---------------------------------------------------------------------------

create table public.itinerary_days (
  trip_id uuid not null references public.trips (id) on delete cascade,
  day int not null check (day >= 1),
  title text not null,
  route_km real,
  primary key (trip_id, day)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day int not null check (day >= 1),
  position int not null default 0,
  start_time time not null,
  end_time time not null,
  status text not null default 'optional' check (status in ('confirmed', 'pending', 'optional')),
  title text not null,
  -- Short label for the day's route path, e.g. "Toyosu Lunch".
  stop_label text not null,
  category text not null,
  meta text not null default '',
  note text,
  note_by uuid references public.profiles (id),
  transit_mode text check (transit_mode in ('train', 'walk')),
  transit_duration text,
  transit_detail text
);

create index itinerary_items_trip_day_idx on public.itinerary_items (trip_id, day, position);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_likes enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_items enable row level security;

-- Profiles: see yourself and anyone you share a trip with; edit only yourself.
create policy "Read own and fellow members' profiles" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.trip_members theirs
      where theirs.user_id = profiles.id and public.is_trip_member(theirs.trip_id)
    )
  );

create policy "Update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Trips
-- The creator check is needed because `insert ... returning` evaluates this policy before the
-- trigger that adds the organizer's membership row has run.
create policy "Members read trips" on public.trips
  for select to authenticated
  using (created_by = (select auth.uid()) or public.is_trip_member(id));

create policy "Signed-in users create trips" on public.trips
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Organizers update trips" on public.trips
  for update to authenticated
  using (public.is_trip_organizer(id));

create policy "Organizers delete trips" on public.trips
  for delete to authenticated
  using (public.is_trip_organizer(id));

-- Membership: joining goes through join_trip(); you can always leave.
create policy "Members read membership" on public.trip_members
  for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Leave a trip" on public.trip_members
  for delete to authenticated
  using (user_id = (select auth.uid()) and role <> 'organizer');

-- Ideas: members read and add; the author or an organizer can edit or delete.
create policy "Members read ideas" on public.ideas
  for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Members add ideas" on public.ideas
  for insert to authenticated
  with check (
    public.is_trip_member(trip_id)
    and added_by = (select auth.uid())
    and status = 'open'
  );

create policy "Authors and organizers edit ideas" on public.ideas
  for update to authenticated
  using (added_by = (select auth.uid()) or public.is_trip_organizer(trip_id))
  with check (public.is_trip_member(trip_id));

create policy "Authors and organizers delete ideas" on public.ideas
  for delete to authenticated
  using (added_by = (select auth.uid()) or public.is_trip_organizer(trip_id));

-- Likes
create policy "Members read likes" on public.idea_likes
  for select to authenticated
  using (exists (
    select 1 from public.ideas i where i.id = idea_id and public.is_trip_member(i.trip_id)
  ));

create policy "Members like ideas" on public.idea_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ideas i where i.id = idea_id and public.is_trip_member(i.trip_id)
    )
  );

create policy "Remove own like" on public.idea_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Polls: members read; organizers create and manage.
create policy "Members read polls" on public.polls
  for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Organizers manage polls" on public.polls
  for all to authenticated
  using (public.is_trip_organizer(trip_id))
  with check (public.is_trip_organizer(trip_id));

create policy "Members read poll options" on public.poll_options
  for select to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and public.is_trip_member(p.trip_id)
  ));

create policy "Organizers manage poll options" on public.poll_options
  for all to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and public.is_trip_organizer(p.trip_id)
  ))
  with check (exists (
    select 1 from public.polls p where p.id = poll_id and public.is_trip_organizer(p.trip_id)
  ));

-- Votes: members see all votes; you can only cast or change your own while the poll is open,
-- and only for an option that belongs to that poll.
create policy "Members read votes" on public.votes
  for select to authenticated
  using (exists (
    select 1 from public.polls p where p.id = poll_id and public.is_trip_member(p.trip_id)
  ));

create policy "Cast own vote" on public.votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls p
      join public.poll_options o on o.poll_id = p.id
      where p.id = poll_id and o.id = option_id
        and p.closes_at > now() and public.is_trip_member(p.trip_id)
    )
  );

create policy "Change own vote" on public.votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls p
      join public.poll_options o on o.poll_id = p.id
      where p.id = poll_id and o.id = option_id and p.closes_at > now()
    )
  );

create policy "Remove own vote" on public.votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Itinerary: members read; organizers edit.
create policy "Members read itinerary days" on public.itinerary_days
  for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Organizers manage itinerary days" on public.itinerary_days
  for all to authenticated
  using (public.is_trip_organizer(trip_id))
  with check (public.is_trip_organizer(trip_id));

create policy "Members read itinerary" on public.itinerary_items
  for select to authenticated
  using (public.is_trip_member(trip_id));

create policy "Organizers manage itinerary" on public.itinerary_items
  for all to authenticated
  using (public.is_trip_organizer(trip_id))
  with check (public.is_trip_organizer(trip_id));

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- Join a trip with its invite code. Returns the trip id.
create function public.join_trip(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into v_trip_id
  from public.trips
  where invite_code = upper(trim(p_invite_code));

  if v_trip_id is null then
    raise exception 'No trip found for that invite code';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;

  return v_trip_id;
end;
$$;

-- Any member can put an open idea forward for a vote.
create function public.propose_idea(p_idea_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ideas
  set status = 'proposed'
  where id = p_idea_id
    and status = 'open'
    and public.is_trip_member(trip_id);

  if not found then
    raise exception 'Idea not found or already proposed';
  end if;
end;
$$;

-- Creates the Tokyo & Kyoto sample trip from the Sprint 3 storyboard, with the caller as
-- organizer. Friends who join with the invite code see and vote on the same data.
create function public.create_demo_trip()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_trip uuid;
  v_poll uuid;
  v_teamlab uuid;
  v_mori uuid;
  v_akihabara uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  insert into public.trips (name, destination, start_date, end_date)
  values ('Tokyo & Kyoto 2027', 'Tokyo & Kyoto, Japan', '2027-05-14', '2027-05-22')
  returning id into v_trip;

  -- Staggered created_at values keep the storyboard's order (newest first).
  insert into public.ideas (trip_id, title, category, price, description, map_x, map_y, created_at)
  values
    (v_trip, 'Tsukiji Outer Market Food Tour', 'Food & Drink', '¥1,500 – ¥3,000',
      'Fresh sashimi skewers, warm tamagoyaki egg omelets, and traditional morning street vendors.',
      60, 54, now() - interval '2 min'),
    (v_trip, 'Vintage Thrift & Record Crawl', 'Shopping', 'Free – ¥3,000',
      'Curated retro boutiques, independent vinyl listening stations, and relaxed cafe alleyways.',
      22, 52, now() - interval '3 min'),
    (v_trip, 'Omoide Yokocho & Sunset', 'Food & Drink', '¥2,000 – ¥4,000',
      'Golden hour panoramic observatory followed by skewers and drinks in cozy lantern-lit lanes.',
      28, 30, now() - interval '4 min'),
    (v_trip, 'Odaiba Sunset Walk & Deck Dinner', 'Outdoors', '¥2,500 – ¥5,000',
      'Bayside walk with Rainbow Bridge skyline views, then dinner at DECKS Tokyo Beach.',
      64, 82, now() - interval '7 min'),
    (v_trip, 'Fushimi Inari Sunrise Hike', 'Outdoors', 'Free',
      'Walk the torii gate trail in Kyoto before the crowds arrive.',
      36, 84, now() - interval '8 min');

  -- Ideas are inserted as 'open' (the only status the insert policy allows), then promoted below.
  insert into public.ideas (trip_id, title, category, price, description, map_x, map_y, created_at)
  values (v_trip, 'teamLab Planets Tokyo', 'Entertainment', '¥3,800 – ¥4,200',
    'Immersive sensory water and crystal light rooms. Reserved timed-entry pass recommended.',
    72, 66, now() - interval '1 min')
  returning id into v_teamlab;

  insert into public.ideas (trip_id, title, category, price, description, map_x, map_y, created_at)
  values (v_trip, 'Mori Art Museum & Sky Deck', 'Attractions', '¥2,000 – ¥2,500',
    'Contemporary art in Roppongi Hills with an open-air deck facing Tokyo Tower.',
    44, 58, now() - interval '5 min')
  returning id into v_mori;

  insert into public.ideas (trip_id, title, category, price, description, map_x, map_y, created_at)
  values (v_trip, 'Akihabara Retro Gaming Crawl', 'Entertainment', '¥1,000 – ¥3,000',
    'Multi-floor arcades, retro game shops, and electronics alleys in Chiyoda.',
    62, 24, now() - interval '6 min')
  returning id into v_akihabara;

  update public.ideas set status = 'poll' where id in (v_teamlab, v_mori, v_akihabara);
  update public.ideas set status = 'confirmed'
  where trip_id = v_trip and title = 'Tsukiji Outer Market Food Tour';

  insert into public.polls (trip_id, question, closes_at)
  values (v_trip, 'Where should we spend Saturday afternoon (2:00 PM – 5:00 PM)?',
    now() + interval '3 days')
  returning id into v_poll;

  insert into public.poll_options (poll_id, idea_id, title, category, area, subtitle, position)
  values
    (v_poll, v_teamlab, 'teamLab Planets', 'Entertainment', 'Toyosu', 'Digital Art & Waterfront', 0),
    (v_poll, v_mori, 'Mori Art Museum & Sky Deck', 'Attractions', 'Roppongi Hills',
      'Contemporary Art & Tokyo Tower Skyline', 1),
    (v_poll, v_akihabara, 'Akihabara Retro Gaming Crawl', 'Entertainment', 'Chiyoda',
      'Arcades & Electronics', 2);

  insert into public.itinerary_days (trip_id, day, title, route_km)
  values (v_trip, 2, 'Tokyo Waterfront & Art', 6.4);

  insert into public.itinerary_items (
    trip_id, day, position, start_time, end_time, status, title, stop_label, category, meta,
    note, note_by, transit_mode, transit_duration, transit_detail
  )
  values
    (v_trip, 2, 0, '09:30', '11:30', 'confirmed', 'Tsukiji Outer Market Food Tour', 'Tsukiji',
      'Food & Drink', 'Food & Drink • Chuo City • Fresh Seafood',
      'Arrive hungry, stalls close around noon!', auth.uid(),
      'train', '18 min', 'Yurakucho Line to Toyosu (Exit 7)'),
    (v_trip, 2, 1, '13:00', '14:15', 'confirmed', 'Seafood Lunch at Toyosu Senkyaku Banrai',
      'Toyosu Lunch', 'Food & Drink', 'Food & Drink • Edo-style Market Dining Hall • 4 Seats',
      'I reserved a table for us under my name!', auth.uid(),
      'walk', '8 min walk', 'Waterside bridge directly to teamLab'),
    (v_trip, 2, 2, '14:30', '17:00', 'pending', 'teamLab Planets Tokyo', 'teamLab Planets',
      'Entertainment', 'Entertainment • Toyosu • Immersive Water & Mirror Exhibition',
      'We walk barefoot through warm water. Lockers are free.', auth.uid(),
      'train', '14 min', 'Yurikamome Monorail to Daiba Station'),
    (v_trip, 2, 3, '18:00', '21:30', 'optional', 'Odaiba Sunset Walk & Deck Dinner',
      'Odaiba Sunset', 'Outdoors', 'Outdoors • Rainbow Bridge Skyline View • DECKS Tokyo Beach',
      'Golden hour bayside walk with skyline views, then drinks on the deck!', auth.uid(),
      null, null, null);

  return v_trip;
end;
$$;

-- Only signed-in users may call the app's functions.
revoke execute on function public.join_trip(text) from public, anon;
revoke execute on function public.propose_idea(uuid) from public, anon;
revoke execute on function public.create_demo_trip() from public, anon;
grant execute on function public.join_trip(text) to authenticated;
grant execute on function public.propose_idea(uuid) to authenticated;
grant execute on function public.create_demo_trip() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: push changes to everyone viewing the trip (RLS still applies)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime
  add table public.ideas, public.idea_likes, public.votes, public.trip_members;
