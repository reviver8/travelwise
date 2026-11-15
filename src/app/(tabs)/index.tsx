import { router, type Href } from 'expo-router';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AvatarStack } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MapPreview } from '@/components/ui/map-preview';
import { Radius, Spacing } from '@/constants/theme';
import { useTrip } from '@/context/trip-context';
import { formatTripDates, isPollOpen, summarizeDay, tripLength } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

const MAP_PINS = [
  { id: 'shinjuku', x: 26, y: 34, label: 'Shinjuku' },
  { id: 'shibuya', x: 34, y: 66, label: 'Shibuya' },
  { id: 'toyosu', x: 70, y: 56, label: 'Toyosu' },
];

export default function OverviewScreen() {
  const theme = useTheme();
  const { trip, members, ideas, poll, itinerary } = useTrip();
  const { days, nights } = tripLength(trip);
  const organizer = members.find((member) => member.role === 'organizer');
  const openVotes = poll && isPollOpen(poll) ? 1 : 0;
  // Feature the first day that has plans.
  const featuredDay = itinerary.find((day) => day.items.length > 0) ?? itinerary[0];

  const invite = () => {
    Share.share({
      message: `Join "${trip.name}" on TravelWise with invite code ${trip.inviteCode}`,
    }).catch(() => {});
  };

  return (
    <Screen title="Trip Overview">
      <View style={[styles.tripChip, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.tripDot, { backgroundColor: theme.primary }]} />
        <ThemedText type="caption" style={styles.bold}>
          {trip.name}
        </ThemedText>
        <Icon name="chevronDown" size={10} color={theme.textSecondary} />
      </View>

      <Card style={styles.heroCard}>
        <HeroArt />
        <View style={styles.heroBody}>
          <ThemedText type="mono" themeColor="primary">
            GROUP TRIP
          </ThemedText>
          <ThemedText type="display">{trip.destination}</ThemedText>
          <View style={styles.heroMeta}>
            <Icon name="calendar" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              {formatTripDates(trip)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              •
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
              {days} Days · {nights} Nights · {members.length} Trip{' '}
              {members.length === 1 ? 'Member' : 'Members'}
            </ThemedText>
          </View>
        </View>
      </Card>

      <SectionHeader
        title="Trip Members"
        badge={<Badge label={String(members.length)} />}
        trailing={
          <Pressable
            accessibilityRole="button"
            onPress={invite}
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Icon name="invite" size={13} color={theme.primary} />
            <ThemedText type="caption" themeColor="primary" style={styles.bold}>
              Invite
            </ThemedText>
          </Pressable>
        }
      />
      <Card style={styles.membersCard}>
        <AvatarStack members={members} size={40} max={6} />
        <View style={styles.membersMeta}>
          {organizer && (
            <ThemedText type="caption" themeColor="textSecondary">
              Organizer: {organizer.name}
            </ThemedText>
          )}
          <ThemedText type="mono" themeColor="textSecondary" selectable>
            Invite code: {trip.inviteCode}
          </ThemedText>
        </View>
      </Card>

      <SectionHeader
        title="Plan Your Trip"
        trailing={
          <ThemedText type="caption" themeColor="textSecondary">
            Next Actions
          </ThemedText>
        }
      />
      <View style={styles.actions}>
        <ActionRow
          href="/ideas"
          icon="idea"
          title="Ideas Pool"
          badge={`${ideas.length} suggestions`}
          badgeTone="accent"
          subtitle="Browse and suggest activities"
        />
        <ActionRow
          href="/decisions"
          icon="vote"
          title="Decisions"
          badge={openVotes ? `${openVotes} open vote` : 'All voted'}
          badgeTone={openVotes ? 'warning' : 'primary'}
          subtitle="Vote on group plans"
        />
        <ActionRow
          href="/itinerary"
          icon="calendar"
          title="Itinerary"
          badge={`Day ${featuredDay.day}`}
          badgeTone="neutral"
          subtitle={`View your trip schedule · Day ${featuredDay.day}: ${summarizeDay(featuredDay)}`}
        />
      </View>

      <SectionHeader
        title="Exploration Map"
        trailing={
          <Pressable
            accessibilityRole="link"
            onPress={() => router.navigate('/ideas?view=map')}
            hitSlop={8}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <ThemedText type="caption" themeColor="primary" style={styles.bold}>
              View Map
            </ThemedText>
            <Icon name="openExternal" size={11} color={theme.primary} />
          </Pressable>
        }
      />
      <Card style={styles.mapCard}>
        <MapPreview pins={MAP_PINS} height={150} />
        <View style={styles.mapFooter}>
          <Icon name="map" size={13} />
          <ThemedText type="caption" style={[styles.bold, styles.flex]}>
            Tokyo Exploration Map
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {MAP_PINS.length} areas mapped
          </ThemedText>
        </View>
      </Card>
    </Screen>
  );
}

type ActionRowProps = {
  href: Href;
  icon: IconName;
  title: string;
  badge: string;
  badgeTone: BadgeTone;
  subtitle: string;
};

function ActionRow({ href, icon, title, badge, badgeTone, subtitle }: ActionRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.navigate(href)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.actionCard}>
        <View style={[styles.actionIcon, { backgroundColor: theme.backgroundElement }]}>
          <Icon name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.actionText}>
          <View style={styles.actionTitle}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <Badge label={badge} tone={badgeTone} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
        <Icon name="chevronRight" size={12} color={theme.textSecondary} />
      </Card>
    </Pressable>
  );
}

const SKYLINE = [34, 52, 28, 66, 44, 110, 38, 58, 30, 74, 48, 36, 62, 26, 50, 40];

/** Dusk skyline illustration. Placeholder until real destination photos are available. */
function HeroArt() {
  return (
    <View style={styles.hero} accessibilityRole="image" accessibilityLabel="Tokyo skyline at dusk">
      <View style={styles.skyline}>
        {SKYLINE.map((height, index) => (
          <View
            key={index}
            style={[styles.building, { height }, height > 100 && styles.tower]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  tripDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroCard: {
    padding: 0,
    overflow: 'hidden',
  },
  hero: {
    height: 150,
    justifyContent: 'flex-end',
    backgroundColor: '#4A3F82',
    backgroundImage: 'linear-gradient(180deg, #2B2F6B 0%, #7A5596 50%, #E88F7A 85%, #F6C38F 100%)',
  },
  skyline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  building: {
    flex: 1,
    backgroundColor: 'rgba(22, 20, 52, 0.82)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tower: {
    flex: 0.35,
    backgroundColor: '#F2683C',
  },
  heroBody: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginTop: Spacing.one,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  membersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  membersMeta: {
    alignItems: 'flex-end',
    gap: Spacing.one,
    flexShrink: 1,
  },
  actions: {
    gap: Spacing.two,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: Spacing.half,
  },
  actionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mapCard: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.half,
  },
});
