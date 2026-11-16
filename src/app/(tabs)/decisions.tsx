import { Host, Picker } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Radius, Spacing } from '@/constants/theme';
import { errorMessage, useTrip } from '@/context/trip-context';
import { formatTime, isPollOpen, timeUntil, type Idea, type Poll } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/alert';

const TIME_SLOTS = Array.from({ length: 49 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const value = `${hour}:${index % 2 ? '30' : '00'}`;
  return { value, label: index === 48 ? 'Midnight' : formatTime(value) };
});
const START_TIMES = TIME_SLOTS.slice(0, -1);

function TimeDropdown({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: typeof TIME_SLOTS;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.timeField}>
      <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
      <Host matchContents={{ vertical: true }}>
        <Picker
          accessibilityLabel={label}
          selectedValue={value}
          onValueChange={onChange}
          enabled={!disabled}>
          <Picker.Item label="Select time" value="" />
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}

export default function DecisionsScreen() {
  const { pollId, compose } = useLocalSearchParams<{ pollId?: string; compose?: string }>();
  const trip = useTrip();
  const theme = useTheme();
  const { polls, votesByPoll } = trip;
  const [localPollId, setLocalPollId] = useState<string>();
  const composing = compose === '1';
  const selectedId = pollId ?? localPollId ?? polls[0]?.id;
  const poll = polls.find((entry) => entry.id === selectedId) ?? polls[0];
  const votes = poll ? votesByPoll[poll.id] ?? {} : {};
  const ideaById = useMemo(() => new Map(trip.ideas.map((idea) => [idea.id, idea])), [trip.ideas]);
  const linkedIdeaIds = useMemo(
    () => new Set(polls
      .filter((entry) => !entry.resolvedAt)
      .flatMap((entry) => entry.options.map((option) => option.ideaId))),
    [polls]
  );

  if (composing) {
    const eligibleIdeas = trip.ideas.filter((idea) =>
      (idea.status === 'open' || idea.status === 'proposed') && !linkedIdeaIds.has(idea.id)
    );
    return (
      <Screen title="Decisions">
        <PollComposer
          ideas={eligibleIdeas}
          onCancel={() => router.setParams({ compose: '0' })}
          onCreated={(id) => {
            setLocalPollId(id);
            router.setParams({ pollId: id, compose: '0' });
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Decisions">
      <Button label="Create Poll" icon="vote" onPress={() => router.setParams({ compose: '1' })} />
      {polls.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pollTabs}>
          {polls.map((entry) => {
            const active = entry.id === poll?.id;
            return (
              <Pressable
                key={entry.id}
                onPress={() => {
                  setLocalPollId(entry.id);
                  router.setParams({ pollId: entry.id });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.pollTab,
                  { backgroundColor: active ? theme.primary : theme.backgroundElement },
                ]}>
                <ThemedText type="caption" style={styles.bold}>
                  {entry.question}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {poll ? (
        <PollView key={poll.id} poll={poll} votes={votes} ideaById={ideaById} />
      ) : (
        <Card style={styles.empty}>
          <ThemedText type="heading">No polls yet</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.centered}>
            Create a poll to compare ideas, or start a vote from an idea card.
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

function PollComposer({
  ideas,
  onCancel,
  onCreated,
}: {
  ideas: Idea[];
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const { createPoll } = useTrip();
  const theme = useTheme();
  const [question, setQuestion] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const eligibleIds = new Set(ideas.map((idea) => idea.id));
  const selectedIds = selected.filter((id) => eligibleIds.has(id));
  const canPublish = !saving && !!question.trim() && selectedIds.length >= 2 && selectedIds.length <= 8;
  const toggle = (id: string) => {
    setSelected((current) => {
      const choices = current.filter((selectedId) => eligibleIds.has(selectedId));
      if (choices.includes(id)) return choices.filter((selectedId) => selectedId !== id);
      return choices.length < 8 ? [...choices, id] : choices;
    });
    setError(undefined);
  };
  const submit = async () => {
    if (!canPublish) return;
    setSaving(true);
    setError(undefined);
    try {
      const id = await createPoll(question.trim(), selectedIds);
      onCreated(id);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.composer}>
      <View style={styles.rowBetween}>
        <ThemedText type="heading">Create a poll</ThemedText>
        <Button label="Cancel" size="small" variant="outline" disabled={saving} onPress={onCancel} />
      </View>
      <Field
        label="Poll question"
        value={question}
        onChangeText={setQuestion}
        maxLength={160}
        multiline
        editable={!saving}
        placeholder="Where should we spend Saturday afternoon (2:00 PM – 5:00 PM)?"
        inputStyle={styles.questionInput}
      />
      <ThemedText type="smallBold">Choose 2–8 ideas</ThemedText>
      {ideas.length < 2 && (
        <Card style={styles.emptyChoices}>
          <ThemedText type="caption" themeColor="textSecondary">
            You need two available ideas. Add more in Ideas to create this poll.
          </ThemedText>
          <Button
            label="Go to Ideas"
            size="small"
            variant="outline"
            icon="idea"
            onPress={() => router.navigate('/ideas')}
          />
        </Card>
      )}
      {ideas.length > 0 && (
        <View accessibilityRole="group" accessibilityLabel="Poll idea choices" style={styles.choiceList}>
          {ideas.map((idea) => {
            const checked = selectedIds.includes(idea.id);
            const disabled = saving || (!checked && selectedIds.length >= 8);
            return (
              <Pressable
                key={idea.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
                disabled={disabled}
                onPress={() => toggle(idea.id)}
                style={[
                  styles.ideaChoice,
                  {
                    borderColor: checked ? theme.primary : theme.border,
                    backgroundColor: checked ? theme.primarySoft : theme.background,
                  },
                ]}>
                <View style={[
                  styles.checkbox,
                  {
                    borderColor: checked ? theme.primary : theme.border,
                    backgroundColor: checked ? theme.primary : 'transparent',
                  },
                ]}>
                  {checked && <Icon name="check" size={12} color={theme.onPrimary} />}
                </View>
                <View style={styles.ideaChoiceText}>
                  <ThemedText type="smallBold">{idea.title}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {idea.category}{idea.price ? ` · ${idea.price}` : ''}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        {selectedIds.length} selected · Voting closes in 3 days
      </ThemedText>
      {error && <ThemedText type="caption" themeColor="warning">{error}</ThemedText>}
      <Button
        label={saving ? 'Publishing…' : 'Publish Poll'}
        icon="vote"
        disabled={!canPublish}
        onPress={submit}
      />
    </View>
  );
}

function PollView({
  poll,
  votes,
  ideaById,
}: {
  poll: Poll;
  votes: Record<string, string>;
  ideaById: Map<string, Idea>;
}) {
  const theme = useTheme();
  const {
    castVote,
    cancelPoll,
    closePollVoting,
    deletePoll,
    resolvePoll,
    userId,
    members,
    memberById,
    isOrganizer,
    itinerary,
    refresh,
  } = useTrip();
  const [voteDraft, setVoteDraft] = useState<{
    pollId: string;
    baselineVote: string | undefined;
    optionId: string;
  }>();
  const selected =
    voteDraft?.pollId === poll.id && voteDraft.baselineVote === votes[userId]
      ? voteDraft.optionId
      : votes[userId];
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [winner, setWinner] = useState<string>();
  const [day, setDay] = useState(itinerary[0]?.day ?? 1);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [poll.id]);
  const open = isPollOpen(poll, now);
  const counts = poll.options.map((option) => ({
    option,
    voters: members.filter((member) => votes[member.id] === option.id),
  }));
  const votedCount = counts.reduce((total, { voters }) => total + voters.length, 0);
  const maxVotes = Math.max(0, ...counts.map((item) => item.voters.length));
  const leaders = counts.filter((item) => item.voters.length === maxVotes && maxVotes > 0);
  const tied = leaders.length > 1;
  const chosenWinner =
    winner && leaders.some(({ option }) => option.id === winner)
      ? winner
      : tied
        ? undefined
        : leaders[0]?.option.id;
  const mayResolve = isOrganizer && leaders.length > 0;
  const leadingOption = poll.options.find((option) => option.id === chosenWinner);
  const needsSchedule = !!leadingOption && !leadingOption.isSkip;
  const scheduleIsValid = !!start && end > start;
  const scheduleConflict = needsSchedule && scheduleIsValid
    ? itinerary.find((entry) => entry.day === day)?.items.find(
        (item) => item.status === 'confirmed' && start < item.endTime && item.startTime < end
      )
    : undefined;
  const creator = memberById(poll.createdBy);
  const scheduledDay = itinerary.find((entry) =>
    entry.items.some((item) => item.sourcePollId === poll.id)
  );

  const submitVote = async () => {
    if (!selected || selected === votes[userId] || saving) return;
    setSaving(true);
    setMessage(undefined);
    try {
      await castVote(poll.id, selected);
      setVoteDraft(undefined);
      setMessage({ text: 'Your vote is in.' });
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setSaving(false);
    }
  };
  const resolveWinner = async () => {
    if (!chosenWinner || !mayResolve || saving) return;
    const option = poll.options.find((entry) => entry.id === chosenWinner);
    if (!option) return;
    const schedule = option.isSkip ? undefined : { day, start, end };
    if (!option.isSkip && (!scheduleIsValid || scheduleConflict)) return;
    setSaving(true);
    setMessage(undefined);
    try {
      await resolvePoll(poll.id, option.id, schedule);
      setMessage({
        text: option.isSkip
          ? 'Poll closed. Nothing was added to the itinerary.'
          : 'Winner added to the itinerary.',
      });
      if (!option.isSkip) {
        router.navigate({ pathname: '/itinerary', params: { day: String(day) } });
      }
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setSaving(false);
      refresh();
    }
  };

  const confirmWinner = () => {
    if (open) {
      confirmAction(
        'End voting now?',
        `${votedCount} of ${members.length} members have voted. This closes voting and confirms your choice.`,
        'Confirm winner',
        () => void resolveWinner()
      );
    } else {
      void resolveWinner();
    }
  };

  const confirmPollAction = (
    label: string,
    description: string,
    action: (id: string) => Promise<void>
  ) => {
    confirmAction(`${label}?`, description, label, () => {
      setSaving(true);
      setMessage(undefined);
      void action(poll.id)
        .catch((error) => setMessage({ text: errorMessage(error), error: true }))
        .finally(() => setSaving(false));
    });
  };
  const requestClose = () => confirmPollAction(
    'Close voting',
    'Members can no longer vote. You can still confirm and schedule the result.',
    closePollVoting
  );
  const requestCancellation = () => confirmPollAction(
    'Cancel poll',
    'Voting will end and its ideas can be used in new polls.',
    cancelPoll
  );
  const requestDeletion = () => confirmPollAction(
    'Delete poll',
    'This removes the poll for everyone in the trip. Confirmed itinerary stops will stay on the schedule.',
    deletePoll
  );

  return (
    <>
      <Card style={styles.pollCard}>
        <View style={styles.rowBetween}>
          <Badge
            label={poll.cancelledAt ? 'Cancelled' : poll.resolvedAt ? 'Resolved' : open ? 'Voting Open' : 'Voting Closed'}
            icon="vote"
            tone={poll.resolvedAt ? 'primary' : open ? 'accent' : 'neutral'}
          />
          {open && (
            <View style={styles.inline}>
              <Icon name="clock" size={12} color={theme.textSecondary} />
              <ThemedText type="mono" themeColor="textSecondary">
                Closes in {timeUntil(poll.closesAt, now)}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="heading">{poll.question}</ThemedText>
        <View style={[styles.pollFooter, { borderTopColor: theme.border }]}>
          <View>
            <ThemedText type="caption" themeColor="textSecondary">Created by</ThemedText>
            <ThemedText type="caption" style={styles.bold}>{creator.name}</ThemedText>
          </View>
          <ThemedText type="mono" themeColor="primary" style={styles.pollProgress}>
            {votedCount} of {members.length} voted
          </ThemedText>
        </View>
      </Card>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {counts.map(({ option, voters }) => {
          const idea = option.ideaId ? ideaById.get(option.ideaId) : undefined;
          const won = poll.winningOptionId === option.id;
          const percent = members.length
            ? Math.round((voters.length / members.length) * 100)
            : 0;
          const disabled = !open || !!poll.resolvedAt;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === option.id, disabled }}
              disabled={disabled}
              onPress={() =>
                setVoteDraft({ pollId: poll.id, baselineVote: votes[userId], optionId: option.id })
              }>
              <Card
                style={[
                  styles.optionCard,
                  selected === option.id && { borderColor: theme.primary },
                  won && { borderColor: theme.primary },
                ]}>
                <View style={styles.optionTop}>
                  <View style={styles.optionTags}>
                    {won && <Badge label="Winner" icon="checkCircle" tone="primary" />}
                    {option.isSkip && <Badge label="Skip" tone="neutral" />}
                  </View>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected === option.id ? theme.primary : theme.border },
                      selected === option.id && { backgroundColor: theme.primary },
                    ]}>
                    {selected === option.id && (
                      <Icon name="check" size={11} color={theme.onPrimary} />
                    )}
                  </View>
                </View>
                <ThemedText type="heading">{option.title}</ThemedText>
                {!!option.subtitle && option.subtitle !== idea?.price && (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {option.subtitle}
                  </ThemedText>
                )}
                {idea && (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {idea.price}
                    {idea.address ? ` · ${idea.address}` : ''}
                    {idea.addedBy ? ` · Added by ${memberById(idea.addedBy).name}` : ''}
                  </ThemedText>
                )}
                <View style={styles.rowBetween}>
                  <View style={styles.inline}>
                    {voters.length > 0 && <AvatarStack members={voters} size={20} />}
                    <ThemedText type="caption">
                      {voters.length} {voters.length === 1 ? 'vote' : 'votes'}
                    </ThemedText>
                  </View>
                  <ThemedText type="mono" themeColor="textSecondary">{percent}%</ThemedText>
                </View>
                <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
                  <View
                    style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.primary }]}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {!poll.resolvedAt && (
        <View style={styles.actions}>
          {open && (
            <Button
              label={saving ? 'Saving…' : votes[userId] ? 'Change Vote' : 'Submit Vote'}
              icon="vote"
              disabled={!selected || selected === votes[userId] || saving}
              onPress={submitVote}
            />
          )}
          {isOrganizer && (
            <>
              <ThemedText type="caption" style={styles.bold}>
                {tied ? 'Tie: choose a leading option' : 'Organizer controls'}
              </ThemedText>
              {tied && (
                <View accessibilityRole="radiogroup" style={styles.inline}>
                  {leaders.map(({ option }) => (
                    <Pressable
                      key={option.id}
                      onPress={() => setWinner(option.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: chosenWinner === option.id }}
                      style={[
                        styles.choice,
                        { borderColor: chosenWinner === option.id ? theme.primary : theme.border },
                      ]}>
                      <ThemedText type="caption">{option.title}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
              {needsSchedule && (
                <>
                  <ThemedText type="caption" themeColor="textSecondary">
                    Schedule {leadingOption?.title}
                  </ThemedText>
                  <View accessibilityRole="radiogroup" style={styles.inline}>
                    {itinerary.map((entry) => (
                      <Pressable
                        key={entry.day}
                        onPress={() => setDay(entry.day)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: day === entry.day }}
                        style={[
                          styles.choice,
                          { borderColor: day === entry.day ? theme.primary : theme.border },
                        ]}>
                        <ThemedText type="caption">Day {entry.day} · {entry.date}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.timeFields}>
                    <TimeDropdown
                      label="Start time"
                      value={start}
                      options={START_TIMES}
                      disabled={saving}
                      onChange={(value) => {
                        setStart(value);
                        if (!value || end <= value) setEnd('');
                      }}
                    />
                    <TimeDropdown
                      label="End time"
                      value={end}
                      options={start ? TIME_SLOTS.filter(({ value }) => value > start) : []}
                      disabled={!start || saving}
                      onChange={setEnd}
                    />
                  </View>
                  {scheduleConflict && (
                    <ThemedText type="caption" themeColor="warning" accessibilityLiveRegion="polite">
                      Overlaps with {scheduleConflict.title} ({scheduleConflict.start}–{scheduleConflict.end}).
                    </ThemedText>
                  )}
                </>
              )}
              <Button
                label={
                  saving
                    ? 'Saving…'
                    : needsSchedule
                      ? 'Confirm & Schedule'
                      : 'Confirm Result'
                }
                icon="checkCircle"
                variant="secondary"
                disabled={!mayResolve || !chosenWinner || saving ||
                  (needsSchedule && (!scheduleIsValid || !!scheduleConflict))}
                onPress={confirmWinner}
              />
              {!leaders.length && (
                <ThemedText type="caption" themeColor="textSecondary">
                  {open ? 'A winner can be confirmed after the first vote.' : 'No votes were cast. Cancel this poll to make its ideas available again.'}
                </ThemedText>
              )}
              {open && (
                <Button label="Close Voting" variant="outline" disabled={saving} onPress={requestClose} />
              )}
              <Button label="Cancel Poll" variant="outline" disabled={saving} onPress={requestCancellation} />
            </>
          )}
        </View>
      )}
      {poll.resolvedAt && (
        <Card style={styles.resolved}>
          {scheduledDay ? (
            <Button
              label={`View Day ${scheduledDay.day} in Itinerary`}
              variant="outline"
              icon="calendar"
              onPress={() => router.navigate({
                pathname: '/itinerary',
                params: { day: String(scheduledDay.day) },
              })}
            />
          ) : (
            <ThemedText type="caption">
              {poll.cancelledAt ? 'This poll was cancelled. Its ideas can be used again.' : 'Poll closed without adding a stop.'}
            </ThemedText>
          )}
        </Card>
      )}
      {isOrganizer && !open && (
        <Button label="Delete Poll" variant="outline" disabled={saving} onPress={requestDeletion} />
      )}
      {message && (
        <ThemedText
          type="caption"
          themeColor={message.error ? 'warning' : 'primary'}
          accessibilityLiveRegion="polite"
          style={styles.centered}>
          {message.text}
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  pressed: { opacity: 0.8 },
  centered: { textAlign: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  pollTabs: { gap: Spacing.one, paddingBottom: Spacing.two },
  pollTab: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
    flexWrap: 'wrap',
  },
  pollCard: { gap: Spacing.two },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pollProgress: { flexShrink: 1, textAlign: 'right' },
  options: { gap: Spacing.two },
  optionCard: { gap: Spacing.one, borderWidth: 2, borderColor: 'transparent' },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  optionTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
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
  fill: { height: '100%', borderRadius: Radius.pill },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  choice: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  timeFields: { flexDirection: 'row', gap: Spacing.two },
  timeField: { flex: 1, gap: Spacing.one },
  resolved: { marginTop: Spacing.two },
  composer: { gap: Spacing.two },
  questionInput: { minHeight: 76, textAlignVertical: 'top' },
  choiceList: { gap: Spacing.one },
  ideaChoice: { minHeight: 56, borderWidth: 1, borderRadius: Radius.small, padding: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  ideaChoiceText: { flex: 1, gap: Spacing.half },
  emptyChoices: { gap: Spacing.two },
});
