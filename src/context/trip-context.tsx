import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Member, Trip } from '@/data/trip';
import * as api from '@/lib/trip-api';
import { authStorage, canPersistSession } from '@/lib/session-storage';
import type { NewIdea, NewTrip, Schedule, TripData } from '@/lib/trip-api';

export type { NewIdea };

type TripStatus = 'signed-out' | 'loading' | 'ready' | 'no-trip' | 'error';

type TripState = { status: TripStatus; data?: TripData; error?: string };

type TripContextValue = TripState & {
  userId: string | null;
  trips: Trip[];
  refresh: () => Promise<void>;
  createTrip: (input: NewTrip) => Promise<void>;
  createDemoTrip: () => Promise<void>;
  joinTrip: (inviteCode: string) => Promise<void>;
  switchTrip: (id: string) => Promise<void>;
  addIdea: (idea: NewIdea) => Promise<void>;
  toggleLike: (ideaId: string) => Promise<void>;
  proposeIdea: (ideaId: string) => Promise<string>;
  createPoll: (question: string, ideaIds: string[]) => Promise<string>;
  castVote: (pollId: string, optionId: string) => Promise<void>;
  resolvePoll: (pollId: string, optionId: string, schedule?: Schedule) => Promise<void>;
  cancelPoll: (pollId: string) => Promise<void>;
  closePollVoting: (pollId: string) => Promise<void>;
  deletePoll: (pollId: string) => Promise<void>;
};

const TripContext = createContext<TripContextValue | null>(null);

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const activeTripStorageKey = (userId: string) => `travelwise.active-trip.${userId}`;

function readActiveTripId(userId: string) {
  if (!canPersistSession || !authStorage) return null;
  try {
    return authStorage.getItem(activeTripStorageKey(userId));
  } catch {
    return null;
  }
}

function writeActiveTripId(userId: string, tripId: string) {
  if (!canPersistSession || !authStorage) return;
  try {
    authStorage.setItem(activeTripStorageKey(userId), tripId);
  } catch {
    // Storage is a convenience; the selected trip remains usable for this session.
  }
}

/**
 * Loads the signed-in user's current trip from Supabase and keeps it in sync in real time.
 * Render with `key={userId}` so the state resets when a different user signs in or out.
 */
export function TripProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<TripState>({ status: userId ? 'loading' : 'signed-out' });
  const [trips, setTrips] = useState<Trip[]>([]);
  const request = useRef({ sequence: 0 });
  const activeTripId = useRef<string | undefined>(undefined);
  const selectionPending = useRef(false);
  const tripId = state.data?.trip.id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    // Do not let a background refresh race and replace an explicit trip selection.
    if (selectionPending.current) return;
    const id = ++request.current.sequence;
    try {
      const availableTrips = await api.fetchTrips(userId);
      if (id !== request.current.sequence) return;
      setTrips(availableTrips);
      if (availableTrips.length === 0) {
        activeTripId.current = undefined;
        setState({ status: 'no-trip' });
        return;
      }
      const preferredId = activeTripId.current ?? readActiveTripId(userId);
      const selectedTrip = availableTrips.find((trip) => trip.id === preferredId) ?? availableTrips[0];
      const data = await api.fetchTripData(selectedTrip.id, userId);
      if (id === request.current.sequence) {
        activeTripId.current = selectedTrip.id;
        writeActiveTripId(userId, selectedTrip.id);
        setState({ status: 'ready', data });
      }
    } catch (error) {
      if (id !== request.current.sequence) return;
      setState((current) =>
        current.data
          ? { ...current, error: errorMessage(error) }
          : { status: 'error', error: errorMessage(error) }
      );
    }
  }, [userId]);

  const openTrip = async (tripIdToOpen: string) => {
    if (!userId) throw new Error('Sign in before opening a trip.');
    if (selectionPending.current) throw new Error('Wait for the trip to finish opening.');
    const requestId = ++request.current.sequence;
    selectionPending.current = true;
    try {
      const availableTrips = await api.fetchTrips(userId);
      const selectedTrip = availableTrips.find((trip) => trip.id === tripIdToOpen);
      if (!selectedTrip) throw new Error('You are no longer a member of that trip.');
      const data = await api.fetchTripData(selectedTrip.id, userId);
      if (requestId !== request.current.sequence) return;
      activeTripId.current = selectedTrip.id;
      writeActiveTripId(userId, selectedTrip.id);
      setTrips(availableTrips);
      setState({ status: 'ready', data });
    } finally {
      if (requestId === request.current.sequence) selectionPending.current = false;
    }
  };

  const runAndOpen = async (create: () => Promise<string>) => {
    if (!userId) throw new Error('Sign in before opening a trip.');
    if (selectionPending.current) throw new Error('Wait for the trip to finish opening.');
    const requestId = ++request.current.sequence;
    selectionPending.current = true;
    try {
      const newTripId = await create();
      if (requestId !== request.current.sequence) return;
      const availableTrips = await api.fetchTrips(userId);
      const selectedTrip = availableTrips.find((trip) => trip.id === newTripId);
      if (!selectedTrip) throw new Error('Trip created, but your membership could not be loaded.');
      const data = await api.fetchTripData(selectedTrip.id, userId);
      if (requestId !== request.current.sequence) return;
      activeTripId.current = selectedTrip.id;
      writeActiveTripId(userId, selectedTrip.id);
      setTrips(availableTrips);
      setState({ status: 'ready', data });
    } finally {
      if (requestId === request.current.sequence) selectionPending.current = false;
    }
  };

  useEffect(() => {
    const activeRequest = request.current;
    void refresh();
    return () => {
      activeRequest.sequence++;
    };
  }, [refresh]);

  // Reload when someone else in the group changes something.
  useEffect(() => {
    if (!tripId) return;
    let timer: ReturnType<typeof setTimeout>;
    let connected = false;
    const queueRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 250);
    };
    const unsubscribe = api.subscribeToTrip(tripId, queueRefresh, (subscribed) => {
      connected = subscribed;
      if (subscribed) queueRefresh();
    });
    const retry = setInterval(() => {
      if (!connected) void refresh();
    }, 10_000);
    return () => {
      clearTimeout(timer);
      clearInterval(retry);
      unsubscribe();
    };
  }, [tripId, refresh]);

  const requireData = () => {
    if (!state.data || !userId) throw new Error('No trip loaded yet.');
    return { ...state.data, userId };
  };

  const value: TripContextValue = {
    ...state,
    userId,
    trips,
    refresh,

    createTrip: (input) => runAndOpen(() => api.createTrip(input)),
    switchTrip: openTrip,

    createDemoTrip: () => runAndOpen(api.createDemoTrip),

    joinTrip: (inviteCode) => runAndOpen(() => api.joinTrip(inviteCode)),

    addIdea: async (idea) => {
      await api.insertIdea(requireData().trip.id, idea);
      await refresh();
    },

    toggleLike: async (ideaId) => {
      const { ideas, userId: me } = requireData();
      const idea = ideas.find((item) => item.id === ideaId);
      if (!idea) return;
      await api.setLike(ideaId, me, !idea.likedByMe);
      await refresh();
    },

    proposeIdea: async (ideaId) => {
      const pollId = await api.proposeIdea(ideaId);
      if (!pollId) throw new Error('Voting setup is incomplete. Apply the demo database migration.');
      await refresh();
      return pollId;
    },

    createPoll: async (question, ideaIds) => {
      const pollId = await api.createPoll(requireData().trip.id, question, ideaIds);
      await refresh();
      return pollId;
    },

    castVote: async (pollId, optionId) => {
      await api.upsertVote(pollId, requireData().userId, optionId);
      await refresh();
    },

    resolvePoll: async (pollId, optionId, schedule) => {
      await api.resolvePoll(pollId, optionId, schedule);
      await refresh();
    },

    cancelPoll: async (pollId) => {
      await api.cancelPoll(pollId);
      await refresh();
    },

    closePollVoting: async (pollId) => {
      await api.closePollVoting(pollId);
      await refresh();
    },

    deletePoll: async (pollId) => {
      await api.deletePoll(pollId);
      await refresh();
    },
  };

  return <TripContext value={value}>{children}</TripContext>;
}

/** Full trip state, including loading and error states. */
export function useTripState() {
  const value = use(TripContext);
  if (!value) {
    throw new Error('useTripState must be used inside <TripProvider>');
  }
  return value;
}

/** For screens that only render once a trip has loaded (the tab screens and Suggest). */
export function useTrip() {
  const { data, userId, ...rest } = useTripState();
  if (!data || !userId) {
    throw new Error('useTrip was called before a trip loaded');
  }

  const memberById = (id: string): Member =>
    data.members.find((member) => member.id === id) ?? {
      id,
      name: 'Former member',
      color: '#8A8D99',
      role: 'member',
    };
  const me = memberById(userId);

  return {
    ...data,
    ...rest,
    userId,
    me,
    isOrganizer: me.role === 'organizer',
    memberById,
    memberIds: data.members.map((member) => member.id),
  };
}
