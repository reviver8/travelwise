import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'primary' | 'accent' | 'warning' | 'info' | 'neutral';

type BadgeProps = {
  label: string;
  icon?: IconName;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, icon, tone = 'neutral', style }: BadgeProps) {
  const theme = useTheme();
  const palette = {
    primary: { background: theme.primarySoft, foreground: theme.primary },
    accent: { background: theme.accent, foreground: theme.accentText },
    warning: { background: theme.warningSoft, foreground: theme.warning },
    info: { background: theme.infoSoft, foreground: theme.info },
    neutral: { background: theme.backgroundElement, foreground: theme.textSecondary },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
      {icon && <Icon name={icon} size={11} color={palette.foreground} />}
      <ThemedText type="mono" style={{ color: palette.foreground }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.small - 2,
  },
});
