import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { canPersistSession, authStorage } from '@/lib/session-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** False until `.env.local` has the project URL and publishable key. */
export const isSupabaseConfigured = supabaseUrl.length > 0 && supabasePublishableKey.length > 0;

export const supabase = createClient(
  // Placeholders keep the app from crashing before it is configured; see isSupabaseConfigured.
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: canPersistSession,
      persistSession: canPersistSession,
      detectSessionInUrl: false,
    },
  }
);

// Only refresh the session while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
