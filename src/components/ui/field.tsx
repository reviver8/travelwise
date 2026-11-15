import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  inputStyle?: StyleProp<TextStyle>;
};

/** Labelled single-line text input. */
export function Field({ label, hint, inputStyle, ...inputProps }: FieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="caption" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
          inputStyle,
        ]}
        {...inputProps}
      />
      {hint && (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one + 2,
  },
  label: {
    fontWeight: 700,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two,
    fontSize: 15,
    borderRadius: Radius.small + 2,
    borderWidth: 1,
  },
});
