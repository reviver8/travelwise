import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PageTransition } from '@/components/page-transition';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Radius, Spacing } from '@/constants/theme';
import { MIN_PASSWORD_LENGTH, useAuth } from '@/context/auth-context';
import { errorMessage } from '@/context/trip-context';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const isSignUp = mode === 'sign-up';
  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = emailValid && passwordValid && (!isSignUp || name.trim().length > 0) && !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(undefined);
  };

  // On success the auth listener updates the session and the router moves on.
  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(undefined);
    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
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
        <PageTransition enabled={Platform.OS === 'web'} style={styles.inner}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Icon name="logo" size={28} color={theme.onPrimary} />
          </View>
          <ThemedText type="display" accessibilityRole="header">
            TravelWise
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Plan group trips together: suggest places, vote, and build the itinerary.
          </ThemedText>

          <Card style={styles.card}>
            <Segmented<Mode>
              value={mode}
              onChange={switchMode}
              options={[
                { value: 'sign-in', label: 'Sign In' },
                { value: 'sign-up', label: 'Create Account' },
              ]}
            />

            {isSignUp && (
              <Field
                label="Your name"
                hint="Shown to your group."
                value={name}
                onChangeText={setName}
                placeholder="Cardin"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType={isSignUp ? 'username' : 'emailAddress'}
              returnKeyType="next"
            />
            <Field
              label="Password"
              hint={isSignUp ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button
              label={
                busy
                  ? isSignUp
                    ? 'Creating account…'
                    : 'Signing in…'
                  : isSignUp
                    ? 'Create Account'
                    : 'Sign In'
              }
              disabled={!canSubmit}
              onPress={submit}
            />

            {error && (
              <View style={[styles.error, { backgroundColor: theme.warningSoft }]}>
                <ThemedText type="caption" themeColor="warning">
                  {error}
                </ThemedText>
              </View>
            )}
          </Card>
        </PageTransition>
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
  logo: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  error: {
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
});
