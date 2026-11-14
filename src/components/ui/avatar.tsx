import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MEMBERS, type MemberId } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  id: MemberId;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ id, size = 24, style }: AvatarProps) {
  const theme = useTheme();
  const member = MEMBERS[id];

  return (
    <View
      accessibilityLabel={member.name}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: member.color,
          borderColor: theme.surface,
        },
        style,
      ]}>
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{member.name[0]}</Text>
    </View>
  );
}

type AvatarStackProps = {
  ids: MemberId[];
  size?: number;
  /** Show at most this many avatars, then a "+N" bubble. */
  max?: number;
};

export function AvatarStack({ ids, size = 24, max = ids.length }: AvatarStackProps) {
  const theme = useTheme();
  const visible = ids.slice(0, max);
  const extra = ids.length - visible.length;
  const overlap = -size * 0.3;

  return (
    <View style={styles.stack}>
      {visible.map((id, index) => (
        <Avatar key={id} id={id} size={size} style={index > 0 && { marginLeft: overlap }} />
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: overlap,
              backgroundColor: theme.backgroundSelected,
              borderColor: theme.surface,
            },
          ]}>
          <Text style={[styles.initial, { fontSize: size * 0.38, color: theme.text }]}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: 700,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
