import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CATEGORY_ICON, Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useTrip } from '@/context/trip-context';
import {
  getPollStats,
  summarizeDay,
  type ItineraryDay,
  type ItineraryItem,
  type ItineraryStatus,
} from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

const STATUS: Record<ItineraryStatus, { label: string; tone: BadgeTone; icon: 'check' | 'vote' | 'clock' }> = {
  confirmed: { label: 'Confirmed', tone: 'primary', icon: 'check' },
  pending: { label: 'Pending Vote', tone: 'warning', icon: 'vote' },
  optional: { label: 'Optional', tone: 'neutral', icon: 'clock' },
};

export default function ItineraryScreen() {
  const theme = useTheme();
  const { itinerary } = useTrip();
  // Start on the first day that has plans.
  const [dayNumber, setDayNumber] = useState(
    () => itinerary.find((entry) => entry.items.length > 0)?.day ?? 1
  );
  const day = itinerary.find((entry) => entry.day === dayNumber) ?? itinerary[0];

  return (
    <Screen title="Itinerary">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={styles.days}>
        {itinerary.map((entry) => {
          const selected = entry.day === day.day;
          return (
            <Pressable
              key={entry.day}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setDayNumber(entry.day)}
              style={[
                styles.dayChip,
                { backgroundColor: selected ? theme.primary : theme.backgroundElement },
              ]}>
              <ThemedText
                type="caption"
                style={[styles.bold, { color: selected ? theme.onPrimary : theme.text }]}>
                Day {entry.day}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: selected ? theme.onPrimary : theme.textSecondary }}>
                {entry.date}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {day.items.length === 0 ? <EmptyDay day={day} /> : <DayPlan day={day} />}
    </Screen>
  );
}

function EmptyDay({ day }: { day: ItineraryDay }) {
  return (
    <Card style={styles.empty}>
      <ThemedText type="heading">
        Day {day.day} · {day.date}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
        Nothing is planned for this day yet. Confirmed ideas will show up here.
      </ThemedText>
      <Button
        label="Browse Ideas"
        icon="idea"
        variant="outline"
        size="small"
        onPress={() => router.navigate('/ideas')}
      />
    </Card>
  );
}

function DayPlan({ day }: { day: ItineraryDay }) {
  const theme = useTheme();
  const { members } = useTrip();

  return (
    <>
      <View style={styles.dayHeader}>
        <ThemedText type="display" style={styles.dayTitle}>
          Day {day.day}
          {day.title ? `: ${day.title}` : ` · ${day.date}`}
        </ThemedText>
        <AvatarStack members={members} size={26} max={3} />
      </View>
      <View style={styles.dayStats}>
        <Icon name="checkCircle" size={13} color={theme.primary} />
        <ThemedText type="mono" themeColor="textSecondary" style={styles.shrink}>
          {summarizeDay(day)}
        </ThemedText>
        <ThemedText type="mono" themeColor="textSecondary">
          •
        </ThemedText>
        <Icon name="group" size={13} color={theme.textSecondary} />
        <ThemedText type="mono" themeColor="textSecondary">
          {members.length} squad {members.length === 1 ? 'member' : 'members'}
        </ThemedText>
      </View>

      <View style={[styles.route, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.inline}>
          <Icon name="route" size={12} color={theme.textSecondary} />
          <ThemedText type="mono" themeColor="textSecondary">
            DAY {day.day} ROUTE PATH{day.routeKm ? ` • ${day.routeKm} km total` : ''}
          </ThemedText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stops}>
          {day.items.map(({ id, stopLabel: stop }, index) => (
            <View key={id} style={styles.inline}>
              {index > 0 && <Icon name="arrowRight" size={10} color={theme.textSecondary} />}
              <View style={[styles.stop, { backgroundColor: theme.surface }]}>
                <View style={[styles.stopNumber, { backgroundColor: theme.primary }]}>
                  <ThemedText type="mono" style={{ color: theme.onPrimary }}>
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={styles.bold}>
                  {stop}
                </ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View>
        {day.items.map((item, index) => (
          <TimelineItem key={item.id} item={item} isLast={index === day.items.length - 1} />
        ))}
      </View>
    </>
  );
}

function TimelineItem({ item, isLast }: { item: ItineraryItem; isLast: boolean }) {
  const theme = useTheme();
  const status = STATUS[item.status];
  const pending = item.status === 'pending';
  const dotColor = pending ? theme.warning : theme.primary;
  const { memberById } = useTrip();
  const author = item.note ? memberById(item.note.by) : undefined;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            { borderColor: item.status === 'optional' ? theme.textSecondary : dotColor },
            item.status !== 'optional' && { backgroundColor: dotColor },
          ]}
        />
        {!isLast && <View style={[styles.railLine, { backgroundColor: theme.border }]} />}
      </View>

      <View style={styles.timelineBody}>
        <Card
          style={[
            styles.itemCard,
            pending && { borderLeftWidth: 3, borderLeftColor: theme.warning },
          ]}>
          <View style={styles.rowBetween}>
            <ThemedText type="mono" themeColor={pending ? 'warning' : 'textSecondary'}>
              {item.start} – {item.end}
            </ThemedText>
            <Badge label={status.label} icon={status.icon} tone={status.tone} />
          </View>
          <ThemedText type="heading">{item.title}</ThemedText>
          <View style={styles.metaRow}>
            <Icon name={CATEGORY_ICON[item.category]} size={12} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
              {item.meta}
            </ThemedText>
          </View>

          {pending && <VotingStatus />}

          {item.note && author && (
            <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
              <Avatar member={author} size={18} />
              <ThemedText type="caption" style={styles.noteText}>
                “{item.note.text}”
              </ThemedText>
              <ThemedText type="caption" style={[styles.bold, { color: author.color }]}>
                {author.name}
              </ThemedText>
            </View>
          )}
        </Card>

        {item.transitAfter && (
          <View style={[styles.transit, { backgroundColor: theme.backgroundElement }]}>
            <Icon name={item.transitAfter.mode} size={12} color={theme.info} />
            <ThemedText type="mono">{item.transitAfter.duration}</ThemedText>
            <ThemedText type="mono" themeColor="textSecondary" style={styles.shrink}>
              • {item.transitAfter.detail}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

/** Live poll summary shown on itinerary items that are still being voted on. */
function VotingStatus() {
  const theme = useTheme();
  const { poll: currentPoll, votes, memberIds } = useTrip();
  if (!currentPoll) return null;
  const poll = getPollStats(currentPoll, votes, memberIds);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Open the vote"
      onPress={() => router.navigate('/decisions')}
      style={({ pressed }) => [
        styles.voting,
        { backgroundColor: theme.warningSoft },
        pressed && styles.pressed,
      ]}>
      <Icon name="vote" size={16} color={theme.warning} />
      <View style={styles.flex}>
        <ThemedText type="caption" style={styles.bold}>
          Voting in Progress
        </ThemedText>
        <ThemedText type="mono" themeColor="textSecondary">
          {poll.voted} of {poll.total} group members voted · Leading option
        </ThemedText>
      </View>
      <View style={[styles.votedCount, { backgroundColor: theme.surface }]}>
        <ThemedText type="mono" themeColor="warning">
          {poll.voted} / {poll.total}
        </ThemedText>
        <ThemedText type="mono" themeColor="warning">
          Voted
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  bold: {
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
  centered: {
    textAlign: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  dayScroll: {
    marginHorizontal: -Spacing.three,
    flexGrow: 0,
  },
  days: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three - 4,
    minHeight: 32,
    borderRadius: Radius.pill,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  dayTitle: {
    flex: 1,
    fontSize: 22,
    lineHeight: 28,
  },
  dayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginTop: -Spacing.two,
  },
  route: {
    gap: Spacing.two,
    padding: Spacing.three - 4,
    borderRadius: Radius.medium,
  },
  stops: {
    gap: Spacing.one + 2,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingLeft: Spacing.one,
    paddingRight: 10,
    minHeight: 26,
    borderRadius: Radius.pill,
  },
  stopNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rail: {
    width: 14,
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: Spacing.one,
  },
  timelineBody: {
    flex: 1,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  itemCard: {
    gap: Spacing.one + 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one + 2,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.small,
  },
  noteText: {
    flex: 1,
    fontStyle: 'italic',
  },
  transit: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one + 2,
    paddingHorizontal: 10,
    minHeight: 26,
    maxWidth: '100%',
    borderRadius: Radius.pill,
  },
  voting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.small,
  },
  votedCount: {
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small - 2,
  },
});
