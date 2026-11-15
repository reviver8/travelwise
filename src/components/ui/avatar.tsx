import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Member } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

type AvatarMember = Pick<Member, 'name' | 'color'>;

type AvatarProps = {
  member: AvatarMember;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ member, size = 24, style }: AvatarProps) {
  const theme = useTheme();

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
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>
        {member.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

type AvatarStackProps = {
  members: (AvatarMember & { id: string })[];
  size?: number;
  /** Show at most this many avatars, then a "+N" bubble. */
  max?: number;
};

export function AvatarStack({ members, size = 24, max = members.length }: AvatarStackProps) {
  const theme = useTheme();
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  const overlap = -size * 0.3;

  return (
    <View style={styles.stack}>
      {visible.map((member, index) => (
        <Avatar
          key={member.id}
          member={member}
          size={size}
          style={index > 0 && { marginLeft: overlap }}
        />
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
