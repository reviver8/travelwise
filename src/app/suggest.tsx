import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPreview } from '@/components/ui/map-preview';
import { Segmented } from '@/components/ui/segmented';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTrip } from '@/context/trip-context';
import {
  BUDGET_LABEL,
  CURRENT_USER,
  findPlace,
  MEMBERS,
  POPULAR_PLACES,
  SUGGEST_TAG_CATEGORY,
  TRIP,
  type Budget,
  type SuggestTag,
} from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

const NOTE_LIMIT = 280;

const TAGS: { value: SuggestTag; icon: IconName }[] = [
  { value: 'Food', icon: 'food' },
  { value: 'Sightseeing', icon: 'camera' },
  { value: 'Fun & Night', icon: 'entertainment' },
  { value: 'Shopping', icon: 'shopping' },
];

const BUDGETS: Budget[] = ['Free', '¥', '¥¥', '¥¥¥'];

// The prototype opens with the storyboard's example already filled in.
const EXAMPLE = {
  query: 'Shibuya Sky Observatory',
  note: 'Incredible sunset skyline views of Shibuya Crossing and Mount Fuji on a clear day! We should reserve the 17:20 rooftop slot early.',
};

export default function SuggestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addIdea } = useTrip();
  const [query, setQuery] = useState(EXAMPLE.query);
  const [tag, setTag] = useState<SuggestTag>('Sightseeing');
  const [budget, setBudget] = useState<Budget>('¥¥');
  const [note, setNote] = useState(EXAMPLE.note);

  const place = findPlace(query);
  const title = place?.name ?? query.trim();
  const author = MEMBERS[CURRENT_USER];
  const isOrganizer = TRIP.organizer === CURRENT_USER;
  // The iOS sheet starts below the status bar already; full-screen modals do not.
  const topInset = Platform.OS === 'ios' ? Spacing.four : insets.top + Spacing.three;

  const pickPopular = (name: string) => {
    setQuery(name);
    const match = findPlace(name);
    if (match) setTag(match.tag);
  };

  const submit = () => {
    addIdea({
      title,
      category: SUGGEST_TAG_CATEGORY[tag],
      price: place?.price ?? BUDGET_LABEL[budget],
      description: note.trim() || 'No description yet.',
    });
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="heading" accessibilityRole="header">
          Suggest a Place
        </ThemedText>
        <Badge label={TRIP.tag} tone="warning" style={styles.headerBadge} />
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <Icon name="close" size={12} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <View style={styles.field}>
            <ThemedText type="caption" style={styles.bold}>
              Place Name or Location
            </ThemedText>
            <View
              style={[
                styles.input,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Icon name="pin" size={14} color={theme.primary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search for a place"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.inputText, { color: theme.text }]}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.popular}>
              <ThemedText type="mono" themeColor="textSecondary">
                POPULAR:
              </ThemedText>
              {POPULAR_PLACES.map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  onPress={() => pickPopular(name)}
                  style={({ pressed }) => [
                    styles.popularChip,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <Icon name="pin" size={10} color={theme.textSecondary} />
                  <ThemedText type="caption" style={styles.bold}>
                    {name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {place ? (
            <Card style={styles.placeCard}>
              <MapPreview height={120} pins={[{ id: place.id, x: 50, y: 52 }]}>
                <View style={styles.mapOverlay}>
                  <Badge label={place.coords} icon="pin" style={styles.mapBadge} />
                  <Badge label="Match Found" tone="accent" style={styles.mapBadge} />
                </View>
              </MapPreview>
              <View style={styles.placeBody}>
                <View style={styles.placeTitle}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {place.name}
                  </ThemedText>
                  <View style={styles.placePrice}>
                    <ThemedText type="mono" themeColor="primary">
                      {place.price}
                    </ThemedText>
                    <ThemedText type="mono" themeColor="textSecondary">
                      {place.priceNote}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {place.address}
                </ThemedText>
                <View style={styles.placeTags}>
                  <Badge label={place.kind} />
                  <Badge label={place.hours} icon="clock" />
                  <Badge label={place.rating} icon="star" tone="warning" />
                </View>
              </View>
            </Card>
          ) : (
            title.length > 0 && (
              <ThemedText type="caption" themeColor="textSecondary">
                No saved match for “{title}”. You can still add it by name.
              </ThemedText>
            )
          )}

          <View style={styles.field}>
            <ThemedText type="caption" style={styles.bold}>
              Category Tag
            </ThemedText>
            <View style={styles.tags}>
              {TAGS.map((item) => {
                const selected = item.value === tag;
                const color = selected ? theme.onPrimary : theme.text;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setTag(item.value)}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: selected ? theme.primary : theme.surface,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <Icon name={item.icon} size={16} color={color} />
                    <ThemedText type="caption" style={[styles.bold, { color }]} numberOfLines={1}>
                      {item.value}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.rowBetween}>
              <ThemedText type="caption" style={styles.bold}>
                Estimated Budget
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {BUDGET_LABEL[budget]}
              </ThemedText>
            </View>
            <Segmented<Budget>
              value={budget}
              onChange={setBudget}
              options={BUDGETS.map((value) => ({ value, label: value }))}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="caption" style={styles.bold}>
              Why do you recommend this?
            </ThemedText>
            <View
              style={[
                styles.noteBox,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <View style={styles.inline}>
                <Avatar id={author.id} size={18} />
                <ThemedText type="caption" style={styles.bold}>
                  {author.name}
                  {isOrganizer ? ' (Organizer)' : ''}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  • Auto-endorsed
                </ThemedText>
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={NOTE_LIMIT}
                multiline
                placeholder="Tell the group what makes this worth a stop."
                placeholderTextColor={theme.textSecondary}
                style={[styles.noteInput, { color: theme.text }]}
              />
              <View style={styles.rowBetween}>
                {/* Photo picking is not part of this prototype yet. */}
                <View style={styles.inline}>
                  <Icon name="photo" size={12} color={theme.textSecondary} />
                  <ThemedText type="caption" themeColor="textSecondary">
                    Attach Photo (coming soon)
                  </ThemedText>
                </View>
                <ThemedText type="mono" themeColor="textSecondary">
                  {note.length}/{NOTE_LIMIT}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.three - 4,
          },
        ]}>
        <View style={styles.footerInner}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancel}
          />
          <Button
            label="Add to Squad Ideas"
            icon="plusCircle"
            disabled={title.length === 0}
            onPress={submit}
            style={styles.submit}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerBadge: {
    alignSelf: 'center',
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three - 4,
    minHeight: 44,
    borderRadius: Radius.small + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  popular: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    minHeight: 26,
    borderRadius: Radius.pill,
  },
  placeCard: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  mapOverlay: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapBadge: {
    alignSelf: 'auto',
  },
  placeBody: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.one,
  },
  placeTitle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  placePrice: {
    alignItems: 'flex-end',
  },
  placeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
    marginTop: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tag: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 56,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.small + 2,
    borderWidth: 1,
  },
  noteBox: {
    gap: Spacing.two,
    padding: Spacing.three - 4,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteInput: {
    minHeight: 72,
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three - 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerInner: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  cancel: {
    flex: 1,
  },
  submit: {
    flex: 2,
  },
});
