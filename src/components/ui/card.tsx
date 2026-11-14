import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 1px 3px rgba(27, 27, 60, 0.06)',
  },
});
