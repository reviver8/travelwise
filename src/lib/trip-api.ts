/**
 * Reads and writes trip data in Supabase and maps database rows to the app's models.
 * Access control lives in the database (row level security), not here.
 */

import {
  formatDay,
  formatTime,
  tripLength,
  type Idea,
  type IdeaCategory,
  type IdeaStatus,
  type ItineraryDay,
  type ItineraryStatus,
  type Member,
  type Poll,
  type Role,
  type Trip,
  type Votes,
} from '@/data/trip';
import { supabase } from '@/lib/supabase';

// Row shapes returned by the queries below. Regenerate with `supabase gen types` once the schema
// settles, then replace these with the generated `Database` type.
type TripRow = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  invite_code: string;
};
type MemberRow = {
  role: Role;
  profiles: { id: string; name: string; color: string } | null;
};
type IdeaRow = {
  id: string;
  title: string;
  category: IdeaCategory;
  price: string;
  description: string;
  status: IdeaStatus;
  added_by: string;
  map_x: number;
  map_y: number;
  idea_likes: { user_id: string }[];
};
type PollRow = {
  id: string;
  question: string;
  created_by: string;
  closes_at: string;
  poll_options: {
    id: string;
    title: string;
    category: IdeaCategory;
    area: string;
    subtitle: string;
    position: number;
  }[];
  votes: { user_id: string; option_id: string }[];
};
type DayRow = { day: number; title: string; route_km: number | null };
type ItemRow = {
  id: string;
  day: number;
  start_time: string;
  end_time: string;
  status: ItineraryStatus;
  title: string;
  stop_label: string;
  category: IdeaCategory;
  meta: string;
  note: string | null;
  note_by: string | null;
  transit_mode: 'train' | 'walk' | null;
  transit_duration: string | null;
  transit_detail: string | null;
};

export type TripData = {
  trip: Trip;
  members: Member[];
  ideas: Idea[];
  poll: Poll | null;
  votes: Votes;
  itinerary: ItineraryDay[];
};

/** Throws the Supabase error, if any, and returns the data otherwise. */
function unwrap<T>(result: { data: unknown; error: Error | null }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/** The trip the user joined most recently, or null if they have none yet. */
export async function fetchCurrentTripId(userId: string) {
  const rows = unwrap<{ trip_id: string }[]>(
    await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(1)
  );
  return rows[0]?.trip_id ?? null;
}

export async function fetchTripData(tripId: string, userId: string): Promise<TripData> {
  const [tripRes, membersRes, ideasRes, pollRes, daysRes, itemsRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase
      .from('trip_members')
      .select('role, profiles(id, name, color)')
      .eq('trip_id', tripId)
      .order('joined_at'),
    supabase
      .from('ideas')
      .select('*, idea_likes(user_id)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
    supabase
      .from('polls')
      .select('*, poll_options(*), votes(user_id, option_id)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('itinerary_days').select('day, title, route_km').eq('trip_id', tripId),
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day')
      .order('position'),
  ]);

  const tripRow = unwrap<TripRow>(tripRes);
  const trip: Trip = {
    id: tripRow.id,
    name: tripRow.name,
    destination: tripRow.destination,
    startDate: tripRow.start_date,
    endDate: tripRow.end_date,
    inviteCode: tripRow.invite_code,
  };

  const members: Member[] = unwrap<MemberRow[]>(membersRes).flatMap((row) =>
    row.profiles ? [{ ...row.profiles, role: row.role }] : []
  );

  const ideas: Idea[] = unwrap<IdeaRow[]>(ideasRes).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    price: row.price,
    description: row.description,
    status: row.status,
    addedBy: row.added_by,
    likes: row.idea_likes.length,
    likedByMe: row.idea_likes.some((like) => like.user_id === userId),
    map: { x: row.map_x, y: row.map_y },
  }));

  const pollRow = unwrap<PollRow | null>(pollRes);
  const poll: Poll | null = pollRow && {
    id: pollRow.id,
    question: pollRow.question,
    createdBy: pollRow.created_by,
    closesAt: pollRow.closes_at,
    options: [...pollRow.poll_options]
      .sort((a, b) => a.position - b.position)
      .map(({ id, title, category, area, subtitle }) => ({ id, title, category, area, subtitle })),
  };
  const votes: Votes = Object.fromEntries(
    (pollRow?.votes ?? []).map((vote) => [vote.user_id, vote.option_id])
  );

  const days = unwrap<DayRow[]>(daysRes);
  const items = unwrap<ItemRow[]>(itemsRes);
  const itinerary: ItineraryDay[] = Array.from({ length: tripLength(trip).days }, (_, index) => {
    const dayNumber = index + 1;
    const dayRow = days.find((row) => row.day === dayNumber);
    return {
      day: dayNumber,
      date: formatDay(trip.startDate, index),
      title: dayRow?.title,
      routeKm: dayRow?.route_km ?? undefined,
      items: items
        .filter((row) => row.day === dayNumber)
        .map((row) => ({
          id: row.id,
          start: formatTime(row.start_time),
          end: formatTime(row.end_time),
          status: row.status,
          title: row.title,
          stopLabel: row.stop_label,
          category: row.category,
          meta: row.meta,
          note: row.note && row.note_by ? { by: row.note_by, text: row.note } : undefined,
          transitAfter:
            row.transit_mode && row.transit_duration
              ? {
                  mode: row.transit_mode,
                  duration: row.transit_duration,
                  detail: row.transit_detail ?? '',
                }
              : undefined,
        })),
    };
  });

  return { trip, members, ideas, poll, votes, itinerary };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type NewIdea = Pick<Idea, 'title' | 'category' | 'price' | 'description'>;

export async function insertIdea(tripId: string, idea: NewIdea) {
  unwrap(await supabase.from('ideas').insert({ trip_id: tripId, ...idea }));
}

export async function setLike(ideaId: string, userId: string, liked: boolean) {
  if (liked) {
    unwrap(await supabase.from('idea_likes').insert({ idea_id: ideaId, user_id: userId }));
  } else {
    unwrap(
      await supabase.from('idea_likes').delete().eq('idea_id', ideaId).eq('user_id', userId)
    );
  }
}

export async function proposeIdea(ideaId: string) {
  unwrap(await supabase.rpc('propose_idea', { p_idea_id: ideaId }));
}

export async function upsertVote(pollId: string, userId: string, optionId: string) {
  unwrap(
    await supabase.from('votes').upsert({
      poll_id: pollId,
      user_id: userId,
      option_id: optionId,
      updated_at: new Date().toISOString(),
    })
  );
}

export async function createDemoTrip() {
  return unwrap<string>(await supabase.rpc('create_demo_trip'));
}

export async function joinTrip(inviteCode: string) {
  return unwrap<string>(await supabase.rpc('join_trip', { p_invite_code: inviteCode }));
}

/**
 * Calls `onChange` whenever ideas, likes, votes, or membership change for this trip.
 * Row level security still applies: users only receive rows they can read.
 */
export function subscribeToTrip(tripId: string, onChange: () => void) {
  const channel = supabase
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ideas', filter: `trip_id=eq.${tripId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` },
      onChange
    )
    // Likes and votes have no trip_id column; RLS limits them to this user's trips.
    .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_likes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
