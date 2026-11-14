import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'outline' | 'soft';
  size?: 'small' | 'large';
  pill?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  icon,
  variant = 'primary',
  size = 'large',
  pill,
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const palette = {
    primary: { background: theme.primary, foreground: theme.onPrimary, border: theme.primary },
    secondary: {
      background: theme.backgroundSelected,
      foreground: theme.text,
      border: theme.backgroundSelected,
    },
    outline: { background: 'transparent', foreground: theme.primary, border: theme.primary },
    soft: { background: theme.primarySoft, foreground: theme.primary, border: theme.primarySoft },
  }[variant];
  const small = size === 'small';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small ? styles.small : styles.large,
        { backgroundColor: palette.background, borderColor: palette.border },
        pill && styles.pill,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {icon && <Icon name={icon} size={small ? 12 : 16} color={palette.foreground} />}
      <ThemedText
        type={small ? 'caption' : 'smallBold'}
        style={[{ color: palette.foreground }, small && styles.smallLabel]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  large: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    borderRadius: Radius.small,
  },
  small: {
    minHeight: 28,
    paddingHorizontal: 10,
    gap: Spacing.one,
    borderRadius: Radius.small,
  },
  smallLabel: {
    fontWeight: 700,
  },
  pill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
});
