-- Run with psql -v trip_id=<Tokyo demo trip UUID> -f scripts/seed-tokyo-demo.sql.
\set ON_ERROR_STOP on
begin;

-- Require the three rehearsal accounts to be members of the specified sample.
select t.created_by as cardin_id, tedy.user_id as tedy_id, grant_member.user_id as grant_id
from public.trips t
join auth.users organizer on organizer.id = t.created_by
join public.trip_members tedy on tedy.trip_id = t.id and tedy.role = 'member'
join auth.users tedy_account on tedy_account.id = tedy.user_id
join public.trip_members grant_member on grant_member.trip_id = t.id and grant_member.role = 'member'
join auth.users grant_account on grant_account.id = grant_member.user_id
where t.id = :'trip_id'::uuid
  and t.name = 'Tokyo & Kyoto 2027'
  and t.destination = 'Tokyo & Kyoto, Japan'
  and organizer.email = 'organizer-rehearsal@example.test'
  and tedy_account.email = 'member-rehearsal@example.test'
  and grant_account.email = 'grant-rehearsal@example.test'
\gset

with authors(title, minutes_before_trip, author_id) as (
  values
    ('teamLab Planets Tokyo', 1, :'tedy_id'::uuid),
    ('Tsukiji Outer Market Food Tour', 2, :'grant_id'::uuid),
    ('Vintage Thrift & Record Crawl', 3, :'grant_id'::uuid),
    ('Omoide Yokocho & Sunset', 4, :'cardin_id'::uuid),
    ('Mori Art Museum & Sky Deck', 5, :'cardin_id'::uuid),
    ('Akihabara Retro Gaming Crawl', 6, :'grant_id'::uuid),
    ('Odaiba Sunset Walk & Deck Dinner', 7, :'tedy_id'::uuid),
    ('Fushimi Inari Sunrise Hike', 8, :'cardin_id'::uuid)
), sample_ideas as (
  select i.id, a.author_id
  from public.ideas i
  join public.trips t on t.id = i.trip_id
  join authors a on a.title = i.title
  where i.trip_id = :'trip_id'::uuid
    and i.created_at = t.created_at - make_interval(mins => a.minutes_before_trip)
), updated_ideas as (
  update public.ideas i
  set added_by = a.author_id
  from sample_ideas a
  where i.id = a.id and i.added_by is distinct from a.author_id
)
update public.itinerary_items i
set added_by = a.author_id
from public.polls p
join public.poll_options o on o.id = p.winning_option_id and o.poll_id = p.id
join sample_ideas a on a.id = o.idea_id
where i.trip_id = :'trip_id'::uuid
  and i.source_poll_id = p.id
  and i.added_by is distinct from a.author_id;

with authors(title, seed_note, author_id, note_author_id) as (
  values
    ('Tsukiji Outer Market Food Tour', 'Arrive hungry, stalls close around noon!',
      :'grant_id'::uuid, :'cardin_id'::uuid),
    ('Seafood Lunch at Toyosu Senkyaku Banrai', 'I reserved a table for us under my name!',
      :'cardin_id'::uuid, :'tedy_id'::uuid),
    ('teamLab Planets Tokyo', 'We walk barefoot through warm water. Lockers are free.',
      :'tedy_id'::uuid, :'grant_id'::uuid),
    ('Odaiba Sunset Walk & Deck Dinner', 'Golden hour bayside walk with skyline views, then drinks on the deck!',
      :'tedy_id'::uuid, :'grant_id'::uuid)
)
update public.itinerary_items i
set added_by = a.author_id, note_by = a.note_author_id
from authors a
where i.trip_id = :'trip_id'::uuid
  and i.day = 2
  and i.source_poll_id is null
  and i.title = a.title
  and i.note = a.seed_note
  and (i.added_by, i.note_by) is distinct from (a.author_id, a.note_author_id);

commit;
