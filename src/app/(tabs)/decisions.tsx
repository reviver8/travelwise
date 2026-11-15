import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { errorMessage, useTrip } from '@/context/trip-context';
import { getPollStats, timeUntil, type Member, type Poll } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

type PollOptionStats = ReturnType<typeof getPollStats>['options'][number];

export default function DecisionsScreen() {
  const { poll } = useTrip();

  return (
    <Screen title="Decisions">
      {poll ? (
        <PollView poll={poll} />
      ) : (
        <Card style={styles.empty}>
          <ThemedText type="heading">No votes yet</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
            Propose ideas for a vote from the Ideas tab. Open polls will show up here.
          </ThemedText>
          <Button
            label="Browse Ideas"
            icon="idea"
            variant="outline"
            size="small"
            onPress={() => router.navigate('/ideas')}
          />
        </Card>
      )}
    </Screen>
  );
}

function PollView({ poll }: { poll: Poll }) {
  const theme = useTheme();
  const { votes, castVote, userId, memberIds, memberById, isOrganizer } = useTrip();
  const stats = getPollStats(poll, votes, memberIds);
  const myVote = votes[userId];
  const [selected, setSelected] = useState(myVote);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const closesIn = timeUntil(poll.closesAt);
  const isOpen = closesIn !== undefined;
  const creator = memberById(poll.createdBy);
  const unchanged = selected === myVote;

  const select = (id: string) => {
    if (!isOpen) return;
    setSelected(id);
    setMessage(undefined);
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(undefined);
    try {
      await castVote(selected);
      const title = poll.options.find((option) => option.id === selected)?.title;
      setMessage({ text: `Your vote for ${title} is in.` });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card style={styles.pollCard}>
        <View style={styles.rowBetween}>
          <Badge
            label={isOpen ? 'Voting Open' : 'Voting Closed'}
            icon="vote"
            tone={isOpen ? 'accent' : 'neutral'}
          />
          {isOpen && (
            <View style={styles.inline}>
              <Icon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText type="mono" themeColor="textSecondary">
                Closes in {closesIn}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="heading">{poll.question}</ThemedText>
        <View style={[styles.pollFooter, { borderTopColor: theme.border }]}>
          <View>
            <ThemedText type="caption" themeColor="textSecondary">
              Created by
            </ThemedText>
            <ThemedText type="caption" style={styles.bold}>
              {creator.name}
            </ThemedText>
          </View>
          <ThemedText type="mono" themeColor="primary" style={styles.pollProgress}>
            {stats.voted} of {stats.total} group members voted ({stats.percent}%)
          </ThemedText>
        </View>
      </Card>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {stats.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            voters={option.voters.map(memberById)}
            isLeader={option.id === stats.leaderId}
            isSelected={option.id === selected}
            disabled={!isOpen}
            onSelect={() => select(option.id)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={saving ? 'Saving…' : myVote ? 'Change Vote' : 'Submit Vote'}
          icon="vote"
          disabled={!isOpen || !selected || unchanged || saving}
          onPress={submit}
        />
        {message && (
          <ThemedText
            type="caption"
            themeColor={message.error ? 'warning' : 'primary'}
            style={styles.centered}>
            {message.text}
          </ThemedText>
        )}
        {/* Confirming a winner is not built yet; it needs an organizer-only database function. */}
        <Button
          label="Confirm Winner & Add to Itinerary"
          icon="checkCircle"
          variant="secondary"
          disabled
        />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
          {isOrganizer
            ? 'Available to you when voting closes (organizer access)'
            : `Available to ${creator.name} when voting closes (organizer access)`}
        </ThemedText>
      </View>
    </>
  );
}

type OptionCardProps = {
  option: PollOptionStats;
  voters: Member[];
  isLeader: boolean;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

function OptionCard({ option, voters, isLeader, isSelected, disabled, onSelect }: OptionCardProps) {
  const theme = useTheme();
  const barColor = isLeader ? theme.primary : theme.info;
  const voteCount = option.voters.length;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.optionCard, isSelected && { borderColor: theme.primary, borderWidth: 2 }]}>
        <View style={styles.optionTop}>
          <View style={styles.optionTags}>
            {isLeader && <Badge label="Current Leader" icon="checkCircle" tone="accent" />}
            <ThemedText type="caption" themeColor="textSecondary">
              {option.category} • <ThemedText type="caption" style={styles.bold}>{option.area}</ThemedText>
            </ThemedText>
          </View>
          <View
            style={[
              styles.radio,
              { borderColor: isSelected ? theme.primary : theme.backgroundSelected },
              isSelected && { backgroundColor: theme.primary },
            ]}>
            {isSelected && <Icon name="check" size={11} color={theme.onPrimary} />}
          </View>
        </View>

        <ThemedText type="heading">{option.title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {option.subtitle}
        </ThemedText>

        <View style={styles.rowBetween}>
          <View style={styles.inline}>
            {voteCount > 0 && <AvatarStack members={voters} size={20} />}
            <ThemedText type="caption">
              {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
            </ThemedText>
          </View>
          <ThemedText type="mono" themeColor="textSecondary">
            {option.percent}%
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
          <View
            style={[styles.fill, { width: `${option.percent}%`, backgroundColor: barColor }]}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.8,
  },
  centered: {
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  pollCard: {
    gap: Spacing.two,
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pollProgress: {
    flexShrink: 1,
    textAlign: 'right',
  },
  options: {
    gap: Spacing.two,
  },
  optionCard: {
    gap: Spacing.one,
    // Keeps the layout steady when the selected border gets thicker.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  optionTags: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: Spacing.half,
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
