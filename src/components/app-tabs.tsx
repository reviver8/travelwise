import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      indicatorColor={theme.primarySoft}
      tintColor={theme.primary}
      labelStyle={{ selected: { color: theme.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          md="grid_view"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ideas">
        <NativeTabs.Trigger.Label>Ideas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'lightbulb', selected: 'lightbulb.fill' }}
          md="lightbulb"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="decisions">
        <NativeTabs.Trigger.Label>Decisions</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="how_to_vote" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="itinerary">
        <NativeTabs.Trigger.Label>Itinerary</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
