import { createContext, use, useState, type ReactNode } from 'react';

import { CURRENT_USER, INITIAL_IDEAS, INITIAL_VOTES, type Idea, type Votes } from '@/data/trip';

export type NewIdea = Pick<Idea, 'title' | 'category' | 'price' | 'description'>;

type TripContextValue = {
  ideas: Idea[];
  votes: Votes;
  addIdea: (idea: NewIdea) => void;
  toggleLike: (id: string) => void;
  proposeIdea: (id: string) => void;
  castVote: (optionId: string) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

/** In-memory trip state shared by all screens. Resets when the app reloads. */
export function TripProvider({ children }: { children: ReactNode }) {
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [votes, setVotes] = useState<Votes>(INITIAL_VOTES);

  const addIdea = (idea: NewIdea) => {
    setIdeas((current) => [
      {
        ...idea,
        id: `idea-${Date.now()}`,
        addedBy: CURRENT_USER,
        likes: 1,
        likedByMe: true,
        status: 'open',
        map: { x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 },
      },
      ...current,
    ]);
  };

  const toggleLike = (id: string) => {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              likedByMe: !idea.likedByMe,
              likes: idea.likes + (idea.likedByMe ? -1 : 1),
            }
          : idea
      )
    );
  };

  const proposeIdea = (id: string) => {
    setIdeas((current) =>
      current.map((idea) =>
        idea.id === id && idea.status === 'open' ? { ...idea, status: 'proposed' } : idea
      )
    );
  };

  const castVote = (optionId: string) => {
    setVotes((current) => ({ ...current, [CURRENT_USER]: optionId }));
  };

  return (
    <TripContext value={{ ideas, votes, addIdea, toggleLike, proposeIdea, castVote }}>
      {children}
    </TripContext>
  );
}

export function useTrip() {
  const value = use(TripContext);
  if (!value) {
    throw new Error('useTrip must be used inside <TripProvider>');
  }
  return value;
}
