import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import type { Member } from '@/data/trip';
import * as api from '@/lib/trip-api';
import type { NewIdea, TripData } from '@/lib/trip-api';

export type { NewIdea };

type TripStatus = 'signed-out' | 'loading' | 'ready' | 'no-trip' | 'error';

type TripState = { status: TripStatus; data?: TripData; error?: string };

type TripContextValue = TripState & {
  userId: string | null;
  refresh: () => void;
  createDemoTrip: () => Promise<void>;
  joinTrip: (inviteCode: string) => Promise<void>;
  addIdea: (idea: NewIdea) => Promise<void>;
  toggleLike: (ideaId: string) => Promise<void>;
  proposeIdea: (ideaId: string) => Promise<void>;
  castVote: (optionId: string) => Promise<void>;
};

const TripContext = createContext<TripContextValue | null>(null);

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
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
  const [reloadKey, setReloadKey] = useState(0);
  const tripId = state.data?.trip.id;

  const refresh = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const currentTripId = await api.fetchCurrentTripId(userId);
        if (cancelled) return;
        if (!currentTripId) {
          setState({ status: 'no-trip' });
          return;
        }
        const data = await api.fetchTripData(currentTripId, userId);
        if (!cancelled) setState({ status: 'ready', data });
      } catch (error) {
        if (cancelled) return;
        // Keep showing the last good data if a background refresh fails.
        setState((current) =>
          current.data
            ? { ...current, error: errorMessage(error) }
            : { status: 'error', error: errorMessage(error) }
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  // Reload when someone else in the group changes something.
  useEffect(() => {
    if (!tripId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = api.subscribeToTrip(tripId, () => {
      // Several rows often change at once (e.g. a vote replaces another); reload once.
      clearTimeout(timer);
      timer = setTimeout(() => setReloadKey((key) => key + 1), 250);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [tripId]);

  /** Applies a change locally, then reloads from the server (rolling back on failure). */
  const optimistic = async (update: (data: TripData) => TripData, run: () => Promise<void>) => {
    setState((current) => (current.data ? { ...current, data: update(current.data) } : current));
    try {
      await run();
    } finally {
      refresh();
    }
  };

  const requireData = () => {
    if (!state.data || !userId) throw new Error('No trip loaded yet.');
    return { ...state.data, userId };
  };

  const value: TripContextValue = {
    ...state,
    userId,
    refresh,

    createDemoTrip: async () => {
      await api.createDemoTrip();
      refresh();
    },

    joinTrip: async (inviteCode) => {
      await api.joinTrip(inviteCode);
      refresh();
    },

    addIdea: async (idea) => {
      await api.insertIdea(requireData().trip.id, idea);
      refresh();
    },

    toggleLike: async (ideaId) => {
      const { ideas, userId: me } = requireData();
      const idea = ideas.find((item) => item.id === ideaId);
      if (!idea) return;
      const liked = !idea.likedByMe;
      await optimistic(
        (data) => ({
          ...data,
          ideas: data.ideas.map((item) =>
            item.id === ideaId
              ? { ...item, likedByMe: liked, likes: item.likes + (liked ? 1 : -1) }
              : item
          ),
        }),
        () => api.setLike(ideaId, me, liked)
      );
    },

    proposeIdea: async (ideaId) => {
      await optimistic(
        (data) => ({
          ...data,
          ideas: data.ideas.map((item) =>
            item.id === ideaId ? { ...item, status: 'proposed' } : item
          ),
        }),
        () => api.proposeIdea(ideaId)
      );
    },

    castVote: async (optionId) => {
      const { poll, userId: me } = requireData();
      if (!poll) return;
      await optimistic(
        (data) => ({ ...data, votes: { ...data.votes, [me]: optionId } }),
        () => api.upsertVote(poll.id, me, optionId)
      );
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
