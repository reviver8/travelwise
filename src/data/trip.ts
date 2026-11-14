/**
 * Mock data for the Sprint 3 prototype. Replace with real trip data once a backend exists.
 */

export type MemberId = 'cardin' | 'grant' | 'tedy' | 'marcus';

export type Member = { id: MemberId; name: string; color: string };

export const MEMBERS: Record<MemberId, Member> = {
  cardin: { id: 'cardin', name: 'Cardin', color: '#00796B' },
  grant: { id: 'grant', name: 'Grant', color: '#E8590C' },
  tedy: { id: 'tedy', name: 'Tedy', color: '#2F6FED' },
  marcus: { id: 'marcus', name: 'Marcus', color: '#2E9E6B' },
};

export const MEMBER_ORDER: MemberId[] = ['cardin', 'grant', 'tedy', 'marcus'];

/** The prototype is shown from the organizer's point of view. */
export const CURRENT_USER: MemberId = 'cardin';

export const TRIP = {
  name: 'Tokyo & Kyoto 2027',
  destination: 'Tokyo & Kyoto, Japan',
  dates: 'May 14 – 22, 2027',
  days: 9,
  nights: 8,
  organizer: 'cardin' as MemberId,
  tag: "TOKYO '27",
  areasMapped: 3,
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
  description: string;
  addedBy: MemberId;
  likes: number;
  likedByMe: boolean;
  status: IdeaStatus;
  /** Position on the placeholder map, in percent. */
  map: { x: number; y: number };
};

export const INITIAL_IDEAS: Idea[] = [
  {
    id: 'teamlab',
    title: 'teamLab Planets Tokyo',
    category: 'Entertainment',
    price: '¥3,800 – ¥4,200',
    description:
      'Immersive sensory water and crystal light rooms. Reserved timed-entry pass recommended.',
    addedBy: 'cardin',
    likes: 4,
    likedByMe: true,
    status: 'poll',
    map: { x: 72, y: 66 },
  },
  {
    id: 'tsukiji',
    title: 'Tsukiji Outer Market Food Tour',
    category: 'Food & Drink',
    price: '¥1,500 – ¥3,000',
    description:
      'Fresh sashimi skewers, warm tamagoyaki egg omelets, and traditional morning street vendors.',
    addedBy: 'grant',
    likes: 3,
    likedByMe: true,
    status: 'confirmed',
    map: { x: 60, y: 54 },
  },
  {
    id: 'thrift',
    title: 'Vintage Thrift & Record Crawl',
    category: 'Shopping',
    price: 'Free – ¥3,000',
    description:
      'Curated retro boutiques, independent vinyl listening stations, and relaxed cafe alleyways.',
    addedBy: 'tedy',
    likes: 2,
    likedByMe: false,
    status: 'open',
    map: { x: 22, y: 52 },
  },
  {
    id: 'omoide',
    title: 'Omoide Yokocho & Sunset',
    category: 'Food & Drink',
    price: '¥2,000 – ¥4,000',
    description:
      'Golden hour panoramic observatory followed by skewers and drinks in cozy lantern-lit lanes.',
    addedBy: 'marcus',
    likes: 3,
    likedByMe: false,
    status: 'open',
    map: { x: 28, y: 30 },
  },
  {
    id: 'mori',
    title: 'Mori Art Museum & Sky Deck',
    category: 'Attractions',
    price: '¥2,000 – ¥2,500',
    description: 'Contemporary art in Roppongi Hills with an open-air deck facing Tokyo Tower.',
    addedBy: 'tedy',
    likes: 2,
    likedByMe: false,
    status: 'poll',
    map: { x: 44, y: 58 },
  },
  {
    id: 'akihabara',
    title: 'Akihabara Retro Gaming Crawl',
    category: 'Entertainment',
    price: '¥1,000 – ¥3,000',
    description: 'Multi-floor arcades, retro game shops, and electronics alleys in Chiyoda.',
    addedBy: 'marcus',
    likes: 1,
    likedByMe: false,
    status: 'poll',
    map: { x: 62, y: 24 },
  },
  {
    id: 'toyosu-lunch',
    title: 'Seafood Lunch at Toyosu Senkyaku Banrai',
    category: 'Food & Drink',
    price: '¥2,000 – ¥3,500',
    description: 'Edo-style market dining hall next to the Toyosu fish market.',
    addedBy: 'grant',
    likes: 3,
    likedByMe: false,
    status: 'confirmed',
    map: { x: 76, y: 58 },
  },
  {
    id: 'odaiba',
    title: 'Odaiba Sunset Walk & Deck Dinner',
    category: 'Outdoors',
    price: '¥2,500 – ¥5,000',
    description: 'Bayside walk with Rainbow Bridge skyline views, then dinner at DECKS Tokyo Beach.',
    addedBy: 'tedy',
    likes: 2,
    likedByMe: false,
    status: 'open',
    map: { x: 64, y: 82 },
  },
  {
    id: 'meiji',
    title: 'Meiji Jingu Morning Walk',
    category: 'Outdoors',
    price: 'Free',
    description: 'Quiet forested shrine grounds a few minutes from Harajuku Station.',
    addedBy: 'cardin',
    likes: 2,
    likedByMe: false,
    status: 'open',
    map: { x: 18, y: 40 },
  },
  {
    id: 'sensoji',
    title: 'Senso-ji & Nakamise Street',
    category: 'Attractions',
    price: 'Free – ¥1,000',
    description: "Tokyo's oldest temple and its snack-lined approach in Asakusa.",
    addedBy: 'marcus',
    likes: 3,
    likedByMe: false,
    status: 'open',
    map: { x: 78, y: 16 },
  },
  {
    id: 'shimokita',
    title: 'Shimokitazawa Live Music Night',
    category: 'Entertainment',
    price: '¥2,500 – ¥4,000',
    description: 'Small live houses and late-night bars in a walkable neighborhood.',
    addedBy: 'marcus',
    likes: 1,
    likedByMe: false,
    status: 'open',
    map: { x: 10, y: 64 },
  },
  {
    id: 'fushimi',
    title: 'Fushimi Inari Sunrise Hike',
    category: 'Outdoors',
    price: 'Free',
    description: 'Walk the torii gate trail in Kyoto before the crowds arrive.',
    addedBy: 'grant',
    likes: 4,
    likedByMe: false,
    status: 'open',
    map: { x: 36, y: 84 },
  },
  {
    id: 'nishiki',
    title: 'Nishiki Market Tasting',
    category: 'Food & Drink',
    price: '¥1,500 – ¥3,000',
    description: "Graze through Kyoto's covered market: pickles, mochi, and grilled skewers.",
    addedBy: 'tedy',
    likes: 2,
    likedByMe: false,
    status: 'open',
    map: { x: 46, y: 76 },
  },
  {
    id: 'arashiyama',
    title: 'Arashiyama Bamboo Grove',
    category: 'Outdoors',
    price: 'Free',
    description: 'Bamboo paths and riverside views on the west side of Kyoto.',
    addedBy: 'cardin',
    likes: 3,
    likedByMe: false,
    status: 'open',
    map: { x: 14, y: 84 },
  },
];

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export type PollOption = {
  id: string;
  title: string;
  category: IdeaCategory;
  area: string;
  subtitle: string;
};

export const POLL = {
  id: 'saturday-afternoon',
  question: 'Where should we spend Saturday afternoon (2:00 PM – 5:00 PM)?',
  createdBy: 'cardin' as MemberId,
  closesIn: '4h',
  options: [
    {
      id: 'teamlab',
      title: 'teamLab Planets',
      category: 'Entertainment',
      area: 'Toyosu',
      subtitle: 'Digital Art & Waterfront',
    },
    {
      id: 'mori',
      title: 'Mori Art Museum & Sky Deck',
      category: 'Attractions',
      area: 'Roppongi Hills',
      subtitle: 'Contemporary Art & Tokyo Tower Skyline',
    },
    {
      id: 'akihabara',
      title: 'Akihabara Retro Gaming Crawl',
      category: 'Entertainment',
      area: 'Chiyoda',
      subtitle: 'Arcades & Electronics',
    },
  ] satisfies PollOption[],
};

export type Votes = Partial<Record<MemberId, string>>;

export const INITIAL_VOTES: Votes = {
  cardin: 'teamlab',
  marcus: 'teamlab',
  tedy: 'mori',
};

export function getPollStats(votes: Votes) {
  const total = MEMBER_ORDER.length;
  const voted = MEMBER_ORDER.filter((id) => votes[id]).length;
  const options = POLL.options.map((option) => {
    const voters = MEMBER_ORDER.filter((id) => votes[id] === option.id);
    return {
      ...option,
      voters,
      percent: voted ? Math.round((voters.length / voted) * 100) : 0,
    };
  });
  const max = Math.max(...options.map((option) => option.voters.length));
  const leaderId = max > 0 ? options.find((option) => option.voters.length === max)?.id : undefined;

  return { total, voted, percent: Math.round((voted / total) * 100), options, leaderId };
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

export type ItineraryStatus = 'confirmed' | 'pending' | 'optional';

export type ItineraryItem = {
  id: string;
  start: string;
  end: string;
  status: ItineraryStatus;
  title: string;
  category: IdeaCategory;
  meta: string;
  note: { by: MemberId; text: string };
  /** How the group gets to the next stop. */
  transitAfter?: { mode: 'train' | 'walk'; duration: string; detail: string };
};

export type ItineraryDay = {
  day: number;
  date: string;
  title?: string;
  routeKm?: number;
  stops: string[];
  items: ItineraryItem[];
};

const DAY_TWO: Omit<ItineraryDay, 'day' | 'date'> = {
  title: 'Tokyo Waterfront & Art',
  routeKm: 6.4,
  stops: ['Tsukiji', 'Toyosu Lunch', 'teamLab Planets', 'Odaiba Sunset'],
  items: [
    {
      id: 'tsukiji',
      start: '09:30 AM',
      end: '11:30 AM',
      status: 'confirmed',
      title: 'Tsukiji Outer Market Food Tour',
      category: 'Food & Drink',
      meta: 'Food & Drink • Chuo City • Fresh Seafood',
      note: { by: 'cardin', text: 'Arrive hungry, stalls close around noon!' },
      transitAfter: {
        mode: 'train',
        duration: '18 min',
        detail: 'Yurakucho Line to Toyosu (Exit 7)',
      },
    },
    {
      id: 'toyosu-lunch',
      start: '01:00 PM',
      end: '02:15 PM',
      status: 'confirmed',
      title: 'Seafood Lunch at Toyosu Senkyaku Banrai',
      category: 'Food & Drink',
      meta: 'Food & Drink • Edo-style Market Dining Hall • 4 Seats',
      note: { by: 'grant', text: 'I reserved a table for us under my name!' },
      transitAfter: {
        mode: 'walk',
        duration: '8 min walk',
        detail: 'Waterside bridge directly to teamLab',
      },
    },
    {
      id: 'teamlab',
      start: '02:30 PM',
      end: '05:00 PM',
      status: 'pending',
      title: 'teamLab Planets Tokyo',
      category: 'Entertainment',
      meta: 'Entertainment • Toyosu • Immersive Water & Mirror Exhibition',
      note: { by: 'grant', text: 'We walk barefoot through warm water. Lockers are free.' },
      transitAfter: {
        mode: 'train',
        duration: '14 min',
        detail: 'Yurikamome Monorail to Daiba Station',
      },
    },
    {
      id: 'odaiba',
      start: '06:00 PM',
      end: '09:30 PM',
      status: 'optional',
      title: 'Odaiba Sunset Walk & Deck Dinner',
      category: 'Outdoors',
      meta: 'Outdoors • Rainbow Bridge Skyline View • DECKS Tokyo Beach',
      note: {
        by: 'tedy',
        text: 'Golden hour bayside walk with skyline views, then drinks on the deck!',
      },
    },
  ],
};

/** One entry per trip day (May 14 – 22). Only Day 2 is planned in the prototype. */
export const ITINERARY: ItineraryDay[] = Array.from({ length: TRIP.days }, (_, index) => {
  const base = { day: index + 1, date: `May ${14 + index}` };
  return index === 1 ? { ...base, ...DAY_TWO } : { ...base, stops: [], items: [] };
});

export function summarizeDay(day: ItineraryDay) {
  const count = (status: ItineraryStatus) =>
    day.items.filter((item) => item.status === status).length;
  return `${count('confirmed')} confirmed · ${count('pending')} pending · ${count('optional')} optional`;
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

/** Stand-in for a places search API. */
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
