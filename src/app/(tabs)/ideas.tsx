import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CATEGORY_ICON, Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPreview } from '@/components/ui/map-preview';
import { Segmented } from '@/components/ui/segmented';
import { Radius, Spacing } from '@/constants/theme';
import { errorMessage, useTrip } from '@/context/trip-context';
import { IDEA_CATEGORIES, isPollOpen, type Idea, type IdeaCategory } from '@/data/trip';
import { showError } from '@/lib/alert';
import { useTheme } from '@/hooks/use-theme';

type ViewMode = 'cards' | 'map';
type Filter = IdeaCategory | 'All';

export default function IdeasScreen() {
  const theme = useTheme();
  const { ideas, polls, itinerary } = useTrip();
  // The view mode lives in the URL so other screens can link straight to the map.
  const params = useLocalSearchParams<{ view?: string }>();
  const view: ViewMode = params.view === 'map' ? 'map' : 'cards';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const q = query.trim().toLowerCase();
  const matchesQuery = (idea: Idea) =>
    !q || idea.title.toLowerCase().includes(q) || idea.description.toLowerCase().includes(q);
  const searched = ideas.filter(matchesQuery);
  const visible = searched.filter((idea) => filter === 'All' || idea.category === filter);
  const filters: Filter[] = ['All', ...IDEA_CATEGORIES];

  return (
    <Screen
      title="Ideas"
      floating={
        <Button
          label="Suggest a Place"
          icon="addPlace"
          pill
          onPress={() => router.push('/suggest')}
          style={styles.fab}
        />
      }>
      <Segmented<ViewMode>
        value={view}
        onChange={(next) => router.setParams({ view: next })}
        options={[
          { value: 'cards', label: 'Cards', icon: 'cards' },
          { value: 'map', label: 'Map View', icon: 'map' },
        ]}
      />

      {ideas.filter((idea) => idea.status === 'open' || idea.status === 'proposed').length >= 2 && (
        <Button
          label="Compare Ideas in a Poll"
          icon="vote"
          variant="outline"
          onPress={() => router.navigate({ pathname: '/decisions', params: { compose: '1' } })}
        />
      )}

      <View
        style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="search" size={14} color={theme.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search spots, cafes, attractions..."
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const selected = item === filter;
          const count =
            item === 'All'
              ? searched.length
              : searched.filter((idea) => idea.category === item).length;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item)}
              style={[
                styles.filterChip,
                { backgroundColor: selected ? theme.primary : theme.backgroundElement },
              ]}>
              <ThemedText
                type="caption"
                style={[styles.bold, { color: selected ? theme.onPrimary : theme.text }]}>
                {item}
              </ThemedText>
              <ThemedText
                type="mono"
                style={{ color: selected ? theme.onPrimary : theme.textSecondary }}>
                {count}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {view === 'map' && (
        <Card style={styles.mapCard}>
          <MapPreview
            height={280}
            pins={visible.map((idea) => ({ id: idea.id, x: idea.map.x, y: idea.map.y }))}
          />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.mapCaption}>
            {visible.length} {visible.length === 1 ? 'place' : 'places'} pinned
          </ThemedText>
        </Card>
      )}

      {visible.length === 0 && (
        <Card style={styles.empty}>
          <ThemedText type="smallBold">{ideas.length ? 'No ideas match' : 'Suggest the first idea'}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {ideas.length ? 'Try a different search or category.' : 'Add a place or activity the group could do.'}
          </ThemedText>
        </Card>
      )}

      {visible.map((idea) =>
        view === 'cards' ? (
          <IdeaCard key={idea.id} idea={idea} polls={polls} itinerary={itinerary} />
        ) : (
          <IdeaRow key={idea.id} idea={idea} />
        )
      )}
    </Screen>
  );
}

function IdeaCard({ idea, polls, itinerary }: { idea: Idea; polls: ReturnType<typeof useTrip>['polls']; itinerary: ReturnType<typeof useTrip>['itinerary'] }) {
  const theme = useTheme();
  const { toggleLike, proposeIdea, memberById } = useTrip();
  const [proposing, setProposing] = useState(false);
  const author = memberById(idea.addedBy);
  const relatedPoll = polls.find((poll) =>
    poll.options.some((option) => option.ideaId === idea.id)
  );
  const hasPoll = idea.status === 'poll' || (idea.status === 'proposed' && !!relatedPoll);
  const votingOpen = !!relatedPoll && isPollOpen(relatedPoll);
  const scheduledDay = idea.status === 'confirmed'
    ? itinerary.find((day) =>
        day.items.some((item) =>
          item.status === 'confirmed' &&
          !!relatedPoll && item.sourcePollId === relatedPoll.id
        )
      )?.day
    : undefined;

  const like = () =>
    toggleLike(idea.id).catch((error) => showError("Couldn't update like", errorMessage(error)));
  const propose = async () => {
    setProposing(true);
    try {
      const pollId = await proposeIdea(idea.id);
      router.navigate({ pathname: '/decisions', params: { pollId } });
    } catch (error) {
      showError("Couldn't propose idea", errorMessage(error));
    } finally {
      setProposing(false);
    }
  };

  return (
    <Card style={styles.ideaCard}>
      <View style={styles.ideaTop}>
        <View style={[styles.ideaIcon, { backgroundColor: theme.primarySoft }]}>
          <Icon name={CATEGORY_ICON[idea.category]} size={20} color={theme.primary} />
        </View>
        <View style={styles.flex}>
          <View style={styles.ideaMeta}>
            <Badge label={idea.category} />
            <ThemedText type="mono" themeColor="primary">
              {idea.price}
            </ThemedText>
          </View>
          <ThemedText type="heading">{idea.title}</ThemedText>
        </View>
      </View>

      <ThemedText type="caption" themeColor="textSecondary">
        {idea.description}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {idea.address || 'Address not provided'}
      </ThemedText>

      <View style={styles.addedBy}>
        <Avatar member={author} size={18} />
        <ThemedText type="caption" style={styles.bold}>
          Added by {author.name}
        </ThemedText>
      </View>

      <View style={[styles.ideaFooter, { borderTopColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={idea.likedByMe ? 'Remove like' : 'Like'}
          accessibilityState={{ selected: idea.likedByMe }}
          hitSlop={10}
          onPress={like}
          style={({ pressed }) => [styles.like, pressed && styles.pressed]}>
          <Icon
            name={idea.likedByMe ? 'heartFill' : 'heart'}
            size={15}
            color={idea.likedByMe ? theme.heart : theme.textSecondary}
          />
          <ThemedText type="caption" style={styles.bold}>
            {idea.likes}
          </ThemedText>
        </Pressable>

        <View style={styles.ideaActions}>
          {hasPoll ? (
            <>
              <Badge
                label={relatedPoll ? (votingOpen ? 'Voting open' : 'Voting closed') : 'In Decisions'}
                icon="vote"
                tone="info"
              />
              <Button
                label={relatedPoll ? (votingOpen ? 'View Poll' : 'View Results') : 'Open Decisions'}
                icon="chevronRight"
                variant="outline"
                size="small"
                onPress={() =>
                  router.navigate({
                    pathname: '/decisions',
                    params: relatedPoll ? { pollId: relatedPoll.id } : {},
                  })
                }
              />
            </>
          ) : idea.status === 'confirmed' ? (
            <>
              <Badge
                label={scheduledDay ? `Scheduled · Day ${scheduledDay}` : 'On itinerary'}
                icon="checkCircle"
                tone="primary"
              />
              <Button
                label="View Itinerary"
                icon="calendar"
                variant="secondary"
                size="small"
                onPress={() =>
                  router.navigate({
                    pathname: '/itinerary',
                    params: scheduledDay ? { day: String(scheduledDay) } : {},
                  })
                }
              />
            </>
          ) : (
            <>
              <Badge label="No poll yet" />
              <Button
                label={proposing ? 'Starting poll…' : 'Start a Poll'}
                icon="plusCircle"
                size="small"
                disabled={proposing}
                onPress={propose}
              />
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

/** Compact row used under the map. */
function IdeaRow({ idea }: { idea: Idea }) {
  const theme = useTheme();
  const { memberById } = useTrip();
  const author = memberById(idea.addedBy);

  return (
    <Card style={styles.ideaRow}>
      <View style={[styles.rowIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={CATEGORY_ICON[idea.category]} size={16} color={theme.primary} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {idea.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {idea.category} · {idea.price}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {idea.address || 'Address not provided'} · {author.name}
        </ThemedText>
      </View>
      <Icon name="heartFill" size={12} color={theme.heart} />
      <ThemedText type="caption" style={styles.bold}>
        {idea.likes}
      </ThemedText>
    </Card>
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
    opacity: 0.6,
  },
  fab: {
    boxShadow: '0 4px 12px rgba(0, 60, 50, 0.3)',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three - 4,
    minHeight: 40,
    borderRadius: Radius.small + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.two,
  },
  filterScroll: {
    // Let the chips scroll edge to edge, past the screen padding.
    marginHorizontal: -Spacing.three,
    flexGrow: 0,
  },
  filters: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three - 4,
    minHeight: 30,
    borderRadius: Radius.pill,
  },
  mapCard: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  mapCaption: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.half,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  ideaCard: {
    gap: Spacing.two,
  },
  ideaTop: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  ideaIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  addedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  ideaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 36,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ideaActions: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three - 4,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
