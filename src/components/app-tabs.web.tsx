import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, type PressableInstance, View, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="overview">Overview</TabButton>
          </TabTrigger>
          <TabTrigger name="ideas" href="/ideas" asChild>
            <TabButton icon="idea">Ideas</TabButton>
          </TabTrigger>
          <TabTrigger name="decisions" href="/decisions" asChild>
            <TabButton icon="vote">Decisions</TabButton>
          </TabTrigger>
          <TabTrigger name="itinerary" href="/itinerary" asChild>
            <TabButton icon="calendar">Itinerary</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ref,
  ...props
}: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable
      {...props}
      // expo-router types this ref as RefAttributes<View>, which no longer matches
      // React Native's strict TypeScript API (RN 0.87+). The runtime value is the instance.
      ref={ref as unknown as React.Ref<PressableInstance>}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Icon name={icon} size={20} color={color} />
      <ThemedText type="caption" style={[styles.tabLabel, { color }]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        { backgroundColor: theme.surface, borderTopColor: theme.border },
      ]}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: BottomTabInset,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.two,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    height: '100%',
  },
  tabLabel: {
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
});
