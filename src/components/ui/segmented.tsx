import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? theme.primary : theme.textSecondary;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && [styles.selected, { backgroundColor: theme.surface }]]}>
            {option.icon && <Icon name={option.icon} size={13} color={color} />}
            <ThemedText type="caption" style={[styles.label, { color }]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.small + 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    minHeight: 32,
    borderRadius: Radius.small,
  },
  selected: {
    boxShadow: '0 1px 2px rgba(27, 27, 60, 0.12)',
  },
  label: {
    fontWeight: 700,
  },
});
