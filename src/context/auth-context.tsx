import { AuthError, type Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/** Minimum length Supabase accepts by default (Authentication → Sign In / Providers → Email). */
export const MIN_PASSWORD_LENGTH = 6;

const CONFIRM_EMAIL_ON =
  'Email confirmation is turned on in Supabase. Turn off "Confirm email" under Authentication → Sign In / Providers → Email, then try again.';

type AuthContextValue = {
  session: Session | null;
  /** True until the stored session has been read on launch. */
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turns Supabase auth errors into messages people can act on. */
function friendlyError(error: AuthError) {
  switch (error.code) {
    case 'invalid_credentials':
      return new Error('Wrong email or password.');
    case 'user_already_exists':
    case 'email_exists':
      return new Error('An account with this email already exists. Sign in instead.');
    case 'email_not_confirmed':
      return new Error(CONFIRM_EMAIL_ON);
    default:
      return error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Read by the database trigger that creates the user's profile.
      options: { data: { name: name.trim() } },
    });
    if (error) throw friendlyError(error);
    // With "Confirm email" off, sign-up signs the user in right away. If it's on, Supabase
    // returns no session and waits for an email this app doesn't use.
    if (!data.session) throw new Error(CONFIRM_EMAIL_ON);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw friendlyError(error);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext value={{ session, loading, signUp, signIn, signOut }}>{children}</AuthContext>
  );
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
