import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatusOverlayProps = {
  loading?: boolean;
  title?: string;
  message?: string;
  actions?: { label: string; onPress: () => void; secondary?: boolean }[];
};

/** Full-screen cover for loading, setup, and error states, drawn above the navigator. */
export function StatusOverlay({ loading, title, message, actions = [] }: StatusOverlayProps) {
  const theme = useTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      {loading && <ActivityIndicator color={theme.primary} size="large" />}
      {title && (
        <ThemedText type="heading" accessibilityRole="header" style={styles.centered}>
          {title}
        </ThemedText>
      )}
      {message && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {message}
        </ThemedText>
      )}
      {actions.map((action) => (
        <Button
          key={action.label}
          label={action.label}
          variant={action.secondary ? 'secondary' : 'primary'}
          onPress={action.onPress}
          style={styles.button}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centered: {
    textAlign: 'center',
    maxWidth: 360,
  },
  button: {
    alignSelf: 'stretch',
    maxWidth: 360,
    width: '100%',
    marginHorizontal: 'auto',
  },
});
