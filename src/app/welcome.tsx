import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { errorMessage, useTripState } from '@/context/trip-context';
import { useTheme } from '@/hooks/use-theme';

/** Shown to signed-in users who are not in a trip yet. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { createDemoTrip, joinTrip } = useTripState();
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState<'demo' | 'join'>();
  const [error, setError] = useState<string>();

  // On success the trip loads and the router switches to the tabs.
  const run = async (kind: 'demo' | 'join', action: () => Promise<void>) => {
    setBusy(kind);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(undefined);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.five, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <View style={styles.inner}>
          <ThemedText type="display" accessibilityRole="header">
            Start planning
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Signed in as {session?.user.email}.
          </ThemedText>

          <Card style={styles.card}>
            <ThemedText type="heading">Join your group</ThemedText>
            <Field
              label="Invite code"
              hint="Ask your trip organizer for the 8-character code."
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="A1B2C3D4"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="join"
              onSubmitEditing={() => inviteCode.trim() && run('join', () => joinTrip(inviteCode))}
            />
            <Button
              label={busy === 'join' ? 'Joining…' : 'Join Trip'}
              disabled={!!busy || inviteCode.trim().length === 0}
              onPress={() => run('join', () => joinTrip(inviteCode))}
            />
          </Card>

          <Card style={styles.card}>
            <ThemedText type="heading">Or try the sample trip</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Creates “Tokyo & Kyoto 2027” with ideas, a vote, and a Day 2 plan. You’ll be the
              organizer and can invite friends with its code.
            </ThemedText>
            <Button
              label={busy === 'demo' ? 'Creating…' : 'Create Sample Trip'}
              variant="outline"
              disabled={!!busy}
              onPress={() => run('demo', createDemoTrip)}
            />
          </Card>

          {error && (
            <View style={[styles.error, { backgroundColor: theme.warningSoft }]}>
              <ThemedText type="caption" themeColor="warning">
                {error}
              </ThemedText>
            </View>
          )}

          <Button
            label="Sign Out"
            variant="secondary"
            size="small"
            onPress={() => signOut().catch((caught) => setError(errorMessage(caught)))}
            style={styles.signOut}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three - 4,
    marginTop: Spacing.two,
  },
  error: {
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  signOut: {
    alignSelf: 'center',
    marginTop: Spacing.three,
  },
});
