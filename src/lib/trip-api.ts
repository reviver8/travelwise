/**
 * Reads and writes trip data in Supabase and maps database rows to the app's models.
 * Access control lives in the database (row level security), not here.
 */

import {
  SAMPLE_ITINERARY_DETAILS,
  formatDay,
  formatTime,
  findPlace,
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
  address?: string;
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
  resolved_at?: string | null;
  cancelled_at?: string | null;
  deleted_at?: string | null;
  winning_option_id?: string | null;
  poll_options: {
    id: string;
    idea_id: string | null;
    is_skip?: boolean;
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
  address?: string;
  price?: string;
  added_by?: string | null;
  source_poll_id?: string | null;
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
  polls: Poll[];
  votesByPoll: Record<string, Votes>;
  itinerary: ItineraryDay[];
};

export type NewTrip = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
};

/** Throws the Supabase error, if any, and returns the data otherwise. */
function unwrap<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
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

/** Trips the signed-in user belongs to, ordered by most recently joined. */
export async function fetchTrips(userId: string): Promise<Trip[]> {
  const rows = unwrap<{ trip_id: string; trips: TripRow | null }[]>(
    await supabase
      .from('trip_members')
      .select('trip_id, joined_at, trips(*)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
  );
  return rows.flatMap(({ trips: row }) =>
    row
      ? [{
          id: row.id,
          name: row.name,
          destination: row.destination,
          startDate: row.start_date,
          endDate: row.end_date,
          inviteCode: row.invite_code,
        }]
      : []
  );
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateNewTrip(input: NewTrip) {
  if (!input.name.trim() || !input.destination.trim()) {
    throw new Error('Enter a trip name and destination.');
  }
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate)) {
    throw new Error('Enter valid trip dates.');
  }
  if (input.endDate < input.startDate) {
    throw new Error('The end date must be on or after the start date.');
  }
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
      .order('id'),
    supabase.from('itinerary_days').select('day, title, route_km').eq('trip_id', tripId),
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day')
      .order('start_time')
      .order('position')
      .order('id'),
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
  const sampleDetails = trip.name === 'Tokyo & Kyoto 2027' ? SAMPLE_ITINERARY_DETAILS : {};

  const ideas: Idea[] = unwrap<IdeaRow[]>(ideasRes).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    price: row.price,
    address: row.address || sampleDetails[row.title]?.address || findPlace(row.title)?.address || '',
    description: row.description,
    status: row.status,
    addedBy: row.added_by,
    likes: row.idea_likes.length,
    likedByMe: row.idea_likes.some((like) => like.user_id === userId),
    map: { x: row.map_x, y: row.map_y },
  }));

  const pollRows = unwrap<PollRow[]>(pollRes);
  const allPolls = pollRows.map((row): Poll & { deleted: boolean } => ({
    id: row.id,
    question: row.question,
    createdBy: row.created_by,
    closesAt: row.closes_at,
    cancelledAt: row.cancelled_at ?? undefined,
    deleted: !!row.deleted_at,
    resolvedAt: row.resolved_at ?? undefined,
    winningOptionId: row.winning_option_id ?? undefined,
    options: [...row.poll_options]
      .sort((a, b) => a.position - b.position)
      .map((option) => ({
        id: option.id,
        ideaId: option.idea_id ?? undefined,
        isSkip: option.is_skip ?? false,
        title: option.title,
        category: option.category,
        area: option.area,
        subtitle: option.subtitle,
      })),
  }));
  const votesByPoll: Record<string, Votes> = Object.fromEntries(
    pollRows.filter((row) => !row.deleted_at).map((row) => [
      row.id,
      Object.fromEntries(
        row.votes
          .filter((vote) => row.poll_options.some((option) => option.id === vote.option_id))
          .map((vote) => [vote.user_id, vote.option_id])
      ),
    ])
  );

  const days = unwrap<DayRow[]>(daysRes);
  const items = unwrap<ItemRow[]>(itemsRes);
  // The original sample shows a pending slot for its multi-option poll. Once that poll
  // creates a confirmed item, keep the pre-filled slot out of the displayed schedule.
  const resolvedSampleTitles = new Set(
    allPolls
      .filter((poll) => poll.resolvedAt && !poll.options.some((option) => option.isSkip))
      .flatMap((poll) =>
        poll.options.flatMap((option) => [
          option.title,
          ideas.find((idea) => idea.id === option.ideaId)?.title,
        ])
      )
  );
  const itinerary: ItineraryDay[] = Array.from({ length: tripLength(trip).days }, (_, index) => {
    const dayNumber = index + 1;
    const dayRow = days.find((row) => row.day === dayNumber);
    return {
      day: dayNumber,
      date: formatDay(trip.startDate, index),
      title: dayRow?.title,
      routeKm: dayRow?.route_km ?? undefined,
      items: items
        .filter(
          (row) =>
            row.day === dayNumber &&
            (row.status !== 'pending' || !resolvedSampleTitles.has(row.title))
        )
        .map((row) => {
          // Older sample trips stored only the place name and descriptive text.
          const idea = ideas.find((entry) => entry.title === row.title);
          const place = findPlace(row.title);
          const sample = sampleDetails[row.title];
          return {
            id: row.id,
            start: formatTime(row.start_time),
            end: formatTime(row.end_time),
            startTime: row.start_time.slice(0, 5),
            endTime: row.end_time.slice(0, 5),
            status: row.status,
            title: row.title,
            stopLabel: row.stop_label,
            category: row.category,
            meta: row.meta,
            address: row.address || idea?.address || sample?.address || place?.address || '',
            price: row.price || idea?.price || sample?.price || place?.price || '',
            addedBy: row.added_by ?? idea?.addedBy,
            sourcePollId: row.source_poll_id ?? undefined,
            note: row.note && row.note_by ? { by: row.note_by, text: row.note } : undefined,
            transitAfter:
              row.transit_mode && row.transit_duration
                ? {
                    mode: row.transit_mode,
                    duration: row.transit_duration,
                    detail: row.transit_detail ?? '',
                  }
                : undefined,
          };
        }),
    };
  });

  const polls = allPolls.filter((poll) => !poll.deleted);
  return { trip, members, ideas, polls, votesByPoll, itinerary };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type NewIdea = Pick<Idea, 'title' | 'category' | 'price' | 'description' | 'address'>;
export type Schedule = { day: number; start: string; end: string };

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
  return unwrap<string>(await supabase.rpc('propose_idea', { p_idea_id: ideaId }));
}

export async function createPoll(tripId: string, question: string, ideaIds: string[]) {
  return unwrap<string>(
    await supabase.rpc('create_poll', {
      p_trip_id: tripId,
      p_question: question,
      p_idea_ids: ideaIds,
    })
  );
}

export async function resolvePoll(pollId: string, optionId: string, schedule?: Schedule) {
  unwrap(
    await supabase.rpc('resolve_poll', {
      p_poll_id: pollId,
      p_option_id: optionId,
      p_day: schedule?.day ?? null,
      p_start: schedule?.start ?? null,
      p_end: schedule?.end ?? null,
    })
  );
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

export async function createTrip(input: NewTrip) {
  validateNewTrip(input);
  return unwrap<string>(
    await supabase.rpc('create_trip', {
      p_name: input.name.trim(),
      p_destination: input.destination.trim(),
      p_start_date: input.startDate,
      p_end_date: input.endDate,
    })
  );
}

export async function joinTrip(inviteCode: string) {
  return unwrap<string>(await supabase.rpc('join_trip', { p_invite_code: inviteCode }));
}

export async function cancelPoll(pollId: string) {
  unwrap(await supabase.rpc('cancel_poll', { p_poll_id: pollId }));
}

export async function closePollVoting(pollId: string) {
  unwrap(await supabase.rpc('close_poll_voting', { p_poll_id: pollId }));
}

export async function deletePoll(pollId: string) {
  unwrap(await supabase.rpc('delete_finished_poll', { p_poll_id: pollId }));
}

/**
 * Calls `onChange` whenever ideas, likes, votes, or membership change for this trip.
 * Row level security still applies: users only receive rows they can read.
 */
export function subscribeToTrip(
  tripId: string,
  onChange: () => void,
  onConnectionChange: (connected: boolean) => void
) {
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'polls', filter: `trip_id=eq.${tripId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'itinerary_days', filter: `trip_id=eq.${tripId}` },
      onChange
    )
    // Likes and votes have no trip_id column; RLS limits them to this user's trips.
    .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_likes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_options' }, onChange);

  let stopped = false;
  // Wait for the signed-in session before joining. An anonymous channel can subscribe
  // successfully without receiving any changes protected by row level security.
  void supabase.realtime.setAuth().then(
    () => {
      if (!stopped) channel.subscribe((status) => onConnectionChange(status === 'SUBSCRIBED'));
    },
    () => {
      if (!stopped) onConnectionChange(false);
    }
  );

  return () => {
    stopped = true;
    void supabase.removeChannel(channel);
  };
}
