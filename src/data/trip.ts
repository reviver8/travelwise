/**
 * App-side models for trip data, plus formatting helpers.
 * Rows are loaded from Supabase in `src/lib/trip-api.ts` and mapped into these shapes.
 */

export type Role = 'organizer' | 'member';

export type Member = { id: string; name: string; color: string; role: Role };

export type Trip = {
  id: string;
  name: string;
  destination: string;
  /** ISO dates, e.g. "2027-05-14". */
  startDate: string;
  endDate: string;
  inviteCode: string;
};

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export type IdeaCategory = 'Food & Drink' | 'Entertainment' | 'Attractions' | 'Shopping' | 'Outdoors';

export const IDEA_CATEGORIES: IdeaCategory[] = [
  'Food & Drink',
  'Entertainment',
  'Attractions',
  'Shopping',
  'Outdoors',
];

export type IdeaStatus = 'open' | 'proposed' | 'poll' | 'confirmed';

export type Idea = {
  id: string;
  title: string;
  category: IdeaCategory;
  price: string;
  address: string;
  description: string;
  addedBy: string;
  likes: number;
  likedByMe: boolean;
  status: IdeaStatus;
  /** Position on the placeholder map, in percent. */
  map: { x: number; y: number };
};

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

export type PollOption = {
  id: string;
  ideaId?: string;
  isSkip: boolean;
  title: string;
  category: IdeaCategory;
  area: string;
  subtitle: string;
};

export type Poll = {
  id: string;
  question: string;
  createdBy: string;
  /** ISO timestamp. */
  closesAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
  winningOptionId?: string;
  options: PollOption[];
};

/** User id → option id. */
export type Votes = Record<string, string>;

export function isPollOpen(poll: Poll, now = Date.now()) {
  return !poll.resolvedAt && new Date(poll.closesAt).getTime() > now;
}

export function getPollStats(poll: Poll, votes: Votes, memberIds: string[]) {
  const total = memberIds.length;
  const voted = memberIds.filter((id) => votes[id]).length;
  const options = poll.options.map((option) => {
    const voters = memberIds.filter((id) => votes[id] === option.id);
    return {
      ...option,
      voters,
      percent: voted ? Math.round((voters.length / voted) * 100) : 0,
    };
  });
  const max = Math.max(0, ...options.map((option) => option.voters.length));
  const leaderId = max > 0 ? options.find((option) => option.voters.length === max)?.id : undefined;

  return {
    total,
    voted,
    percent: total ? Math.round((voted / total) * 100) : 0,
    options,
    leaderId,
  };
}

/** "4h", "2d", "35m" until the poll closes, or undefined once closed. */
export function timeUntil(iso: string, now = Date.now()) {
  const remaining = new Date(iso).getTime() - now;
  if (remaining <= 0) return undefined;
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

export type ItineraryStatus = 'confirmed' | 'pending' | 'optional';

export type ItineraryItem = {
  id: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  status: ItineraryStatus;
  title: string;
  stopLabel: string;
  category: IdeaCategory;
  meta: string;
  address: string;
  price: string;
  addedBy?: string;
  sourcePollId?: string;
  note?: { by: string; text: string };
  /** How the group gets to the next stop. */
  transitAfter?: { mode: 'train' | 'walk'; duration: string; detail: string };
};

export type ItineraryDay = {
  day: number;
  date: string;
  title?: string;
  routeKm?: number;
  items: ItineraryItem[];
};

/** Details missing from the original Tokyo & Kyoto sample rows. */
export const SAMPLE_ITINERARY_DETAILS: Record<string, { address: string; price?: string }> = {
  'Seafood Lunch at Toyosu Senkyaku Banrai': {
    address: '6-5-1 Toyosu, Koto City, Tokyo',
    price: '¥2,000 per person',
  },
  'Odaiba Sunset Walk & Deck Dinner': {
    address: '1-6-1 Daiba, Minato City, Tokyo',
  },
};

export function summarizeDay(day: ItineraryDay) {
  const count = (status: ItineraryStatus) =>
    day.items.filter((item) => item.status === status).length;
  return `${count('confirmed')} confirmed · ${count('pending')} pending · ${count('optional')} optional`;
}

// ---------------------------------------------------------------------------
// Dates and times
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

function parseDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** "May 15" for day `offset` (0-based) after `startIso`. */
export function formatDay(startIso: string, offset = 0) {
  const date = new Date(parseDate(startIso) + offset * DAY_MS);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function tripLength(trip: Trip) {
  const days = Math.round((parseDate(trip.endDate) - parseDate(trip.startDate)) / DAY_MS) + 1;
  return { days, nights: Math.max(0, days - 1) };
}

/** "May 14 – 22, 2027" (or "May 30 – Jun 2, 2027" across months). */
export function formatTripDates(trip: Trip) {
  const start = new Date(parseDate(trip.startDate));
  const end = new Date(parseDate(trip.endDate));
  const endLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${end.getUTCDate()}`
      : `${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${formatDay(trip.startDate)} – ${endLabel}, ${end.getUTCFullYear()}`;
}

/** "13:00:00" → "01:00 PM". */
export function formatTime(value: string) {
  const [h, m] = value.split(':').map(Number);
  if (h === 24) return 'Midnight';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// ---------------------------------------------------------------------------
// Suggest a Place
// ---------------------------------------------------------------------------

export type SuggestTag = 'Food' | 'Sightseeing' | 'Fun & Night' | 'Shopping';

export const SUGGEST_TAG_CATEGORY: Record<SuggestTag, IdeaCategory> = {
  Food: 'Food & Drink',
  Sightseeing: 'Attractions',
  'Fun & Night': 'Entertainment',
  Shopping: 'Shopping',
};

export type Budget = 'Free' | '¥' | '¥¥' | '¥¥¥';

export const BUDGET_LABEL: Record<Budget, string> = {
  Free: 'Free',
  '¥': 'Budget (~¥1,000)',
  '¥¥': 'Moderate (~¥2,000)',
  '¥¥¥': 'Premium (¥5,000+)',
};

export type Place = {
  id: string;
  /** Lowercase terms that match this place when searching. */
  keywords: string[];
  name: string;
  address: string;
  price: string;
  priceNote: string;
  kind: string;
  hours: string;
  rating: string;
  coords: string;
  tag: SuggestTag;
};

/** Stand-in for a places search API (for example Google Places), which needs a server-side key. */
export const PLACES: Place[] = [
  {
    id: 'shibuya-sky',
    keywords: ['shibuya sky', 'scramble square'],
    name: 'Shibuya Sky (Scramble Square)',
    address: '2-24-12 Shibuya, Shibuya City, Tokyo',
    price: '¥2,200',
    priceNote: 'per ticket',
    kind: 'Attractions & Views',
    hours: 'Open 10:00 – 22:30',
    rating: '4.8 (8.4k reviews)',
    coords: '35.6585° N, 139.7022° E',
    tag: 'Sightseeing',
  },
  {
    id: 'meiji-jingu',
    keywords: ['meiji'],
    name: 'Meiji Jingu',
    address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo',
    price: 'Free',
    priceNote: 'entry',
    kind: 'Shrine & Gardens',
    hours: 'Open sunrise – sunset',
    rating: '4.6 (41k reviews)',
    coords: '35.6764° N, 139.6993° E',
    tag: 'Sightseeing',
  },
  {
    id: 'tsukiji',
    keywords: ['tsukiji'],
    name: 'Tsukiji Outer Market',
    address: '4-16-2 Tsukiji, Chuo City, Tokyo',
    price: '¥1,500',
    priceNote: 'avg. spend',
    kind: 'Street Food & Market',
    hours: 'Open 05:00 – 14:00',
    rating: '4.2 (56k reviews)',
    coords: '35.6655° N, 139.7707° E',
    tag: 'Food',
  },
  {
    id: 'teamlab',
    keywords: ['teamlab'],
    name: 'teamLab Planets Tokyo',
    address: '6-1-16 Toyosu, Koto City, Tokyo',
    price: '¥3,800',
    priceNote: 'per ticket',
    kind: 'Digital Art Museum',
    hours: 'Open 09:00 – 22:00',
    rating: '4.6 (28k reviews)',
    coords: '35.6491° N, 139.7898° E',
    tag: 'Fun & Night',
  },
];

export const POPULAR_PLACES = ['Meiji Jingu', 'Tsukiji Outer Market', 'teamLab Planets'];

export function findPlace(query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return undefined;
  return PLACES.find(
    (place) =>
      place.name.toLowerCase().includes(q) || place.keywords.some((keyword) => q.includes(keyword))
  );
}
