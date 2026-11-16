import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PageTransition } from '@/components/page-transition';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { errorMessage, useTrip } from '@/context/trip-context';
import { confirmAction, showError } from '@/lib/alert';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  title: string;
  children: ReactNode;
  /** Content pinned above the tab bar, such as a floating action button. */
  floating?: ReactNode;
};

/** Shared tab screen shell: app header, scrolling content, optional floating action. */
export function Screen({ title, children, floating }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { me } = useTrip();
  const tabBarSpace = insets.bottom + BottomTabInset;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.headerInner}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Icon name="logo" size={16} color={theme.onPrimary} />
          </View>
          <ThemedText type="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            hitSlop={8}
            onPress={() =>
              confirmAction(
                'Sign out?',
                `You're signed in as ${me.name} (${session?.user.email ?? 'unknown email'}).`,
                'Sign Out',
                () => signOut().catch((error) => showError('Sign out failed', errorMessage(error)))
              )
            }
            style={({ pressed }) => pressed && styles.pressed}>
            <Avatar member={me} size={32} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarSpace + Spacing.four + (floating ? 56 : 0) },
        ]}>
        <PageTransition style={styles.inner}>{children}</PageTransition>
      </ScrollView>

      {floating && (
        <View style={[styles.floating, { bottom: tabBarSpace + Spacing.three }]}>{floating}</View>
      )}
    </View>
  );
}

/** Row with a section title on the left and an optional trailing element. */
export function SectionHeader({
  title,
  badge,
  trailing,
}: {
  title: string;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="default" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {badge}
      <View style={styles.sectionSpacer} />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    alignItems: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: -Spacing.two,
  },
  sectionTitle: {
    fontWeight: 700,
  },
  sectionSpacer: {
    flex: 1,
  },
});
