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
import { useTrip } from '@/context/trip-context';
import { CURRENT_USER, getPollStats, MEMBERS, POLL } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

type PollOptionStats = ReturnType<typeof getPollStats>['options'][number];

export default function DecisionsScreen() {
  const theme = useTheme();
  const { votes, castVote } = useTrip();
  const poll = getPollStats(votes);
  const myVote = votes[CURRENT_USER];
  const [selected, setSelected] = useState(myVote);
  const [submitted, setSubmitted] = useState(false);
  const organizer = MEMBERS[POLL.createdBy].name;
  const myVoteTitle = poll.options.find((option) => option.id === myVote)?.title;

  const select = (id: string) => {
    setSelected(id);
    setSubmitted(false);
  };

  const submit = () => {
    if (!selected) return;
    castVote(selected);
    setSubmitted(true);
  };

  return (
    <Screen title="Decisions">
      <Card style={styles.pollCard}>
        <View style={styles.rowBetween}>
          <Badge label="Voting Open" icon="vote" tone="accent" />
          <View style={styles.inline}>
            <Icon name="clock" size={12} color={theme.textSecondary} />
            <ThemedText type="mono" themeColor="textSecondary">
              Closes in {POLL.closesIn}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="heading">{POLL.question}</ThemedText>
        <View style={[styles.pollFooter, { borderTopColor: theme.border }]}>
          <View>
            <ThemedText type="caption" themeColor="textSecondary">
              Created by
            </ThemedText>
            <ThemedText type="caption" style={styles.bold}>
              {organizer}
            </ThemedText>
          </View>
          <ThemedText type="mono" themeColor="primary" style={styles.pollProgress}>
            {poll.voted} of {poll.total} group members voted ({poll.percent}%)
          </ThemedText>
        </View>
      </Card>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {poll.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isLeader={option.id === poll.leaderId}
            isSelected={option.id === selected}
            onSelect={() => select(option.id)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Submit Vote" icon="vote" disabled={!selected} onPress={submit} />
        {submitted && myVoteTitle && (
          <ThemedText type="caption" themeColor="primary" style={styles.centered}>
            Your vote for {myVoteTitle} is in.
          </ThemedText>
        )}
        <Button
          label="Confirm Winner & Add to Itinerary"
          icon="checkCircle"
          variant="secondary"
          disabled
        />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
          Available when voting closes ({organizer} organizer access)
        </ThemedText>
      </View>
    </Screen>
  );
}

type OptionCardProps = {
  option: PollOptionStats;
  isLeader: boolean;
  isSelected: boolean;
  onSelect: () => void;
};

function OptionCard({ option, isLeader, isSelected, onSelect }: OptionCardProps) {
  const theme = useTheme();
  const barColor = isLeader ? theme.primary : theme.info;
  const voteCount = option.voters.length;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
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
            {voteCount > 0 && <AvatarStack ids={option.voters} size={20} />}
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
