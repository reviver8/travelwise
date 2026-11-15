import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { StatusOverlay } from '@/components/status-overlay';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { TripProvider, useTripState } from '@/context/trip-context';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  // Keyed so trip state resets when a different user signs in or out.
  return (
    <TripProvider key={userId ?? 'signed-out'} userId={userId}>
      <AppStack />
    </TripProvider>
  );
}

function AppStack() {
  const { loading: authLoading, signOut } = useAuth();
  const { status, error, refresh } = useTripState();
  const signedIn = status !== 'signed-out';
  const hasTrip = status === 'ready';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={hasTrip}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="suggest"
            options={{
              // A native sheet on iOS; a regular modal elsewhere.
              presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasTrip}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>

      {!isSupabaseConfigured ? (
        <StatusOverlay
          title="Connect Supabase"
          message="Copy .env.example to .env.local, add your project URL and publishable key, then restart the dev server."
        />
      ) : authLoading || status === 'loading' ? (
        <StatusOverlay loading />
      ) : status === 'error' ? (
        <StatusOverlay
          title="Couldn't load your trip"
          message={error}
          actions={[
            { label: 'Try Again', onPress: refresh },
            { label: 'Sign Out', onPress: () => signOut().catch(() => {}), secondary: true },
          ]}
        />
      ) : null}
    </>
  );
}
