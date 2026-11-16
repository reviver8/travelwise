import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { PageTransition } from '@/components/page-transition';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPreview } from '@/components/ui/map-preview';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { errorMessage, useTrip } from '@/context/trip-context';
import {
  findPlace,
  POPULAR_PLACES,
  SUGGEST_TAG_CATEGORY,
  type SuggestTag,
} from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

const NOTE_LIMIT = 280;

function exactSavedPlace(name: string) {
  const match = findPlace(name);
  return match?.name.toLowerCase() === name.trim().toLowerCase() ? match : undefined;
}

const TAGS: { value: SuggestTag; icon: IconName }[] = [
  { value: 'Food', icon: 'food' },
  { value: 'Sightseeing', icon: 'camera' },
  { value: 'Fun & Night', icon: 'entertainment' },
  { value: 'Shopping', icon: 'shopping' },
];

export default function SuggestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { addIdea, trip, me, isOrganizer } = useTrip();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<SuggestTag>('Sightseeing');
  const [address, setAddress] = useState('');
  const [cost, setCost] = useState('');
  const matchedPlaceId = useRef<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const hasSavedPlaces = /\btokyo\b/i.test(trip.destination);
  const place = hasSavedPlaces ? exactSavedPlace(query) : undefined;
  const title = query.trim();
  // e.g. "TOKYO '27" from "Tokyo & Kyoto, Japan" ending in 2027.
  const tripTag = `${trip.destination.split(/[\s,&]/)[0].toUpperCase()} '${trip.endDate.slice(2, 4)}`;
  // The iOS sheet starts below the status bar already; full-screen modals do not.
  const topInset = Platform.OS === 'ios' ? Spacing.four : insets.top + Spacing.three;

  const changeQuery = (value: string) => {
    setQuery(value);
    const match = hasSavedPlaces ? exactSavedPlace(value) : undefined;
    if (match?.id !== matchedPlaceId.current) {
      matchedPlaceId.current = match?.id;
      if (match) setTag(match.tag);
      setAddress((current) => match?.address ?? (current === place?.address ? '' : current));
      setCost((current) => match?.price ?? (current === place?.price ? '' : current));
    }
  };

  const pickPopular = (name: string) => {
    matchedPlaceId.current = undefined;
    changeQuery(findPlace(name)?.name ?? name);
  };

  const submit = async () => {
    if (!title || saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await addIdea({
        title,
        category: SUGGEST_TAG_CATEGORY[tag],
        address: address.trim(),
        price: cost.trim(),
        description: note.trim(),
      });
      router.dismissTo('/ideas');
    } catch (caught) {
      setError(errorMessage(caught));
      setSaving(false);
    }
  };

  return (
    <PageTransition
      enabled={Platform.OS === 'web'}
      style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="heading" accessibilityRole="header">
          Suggest a Place
        </ThemedText>
        <Badge label={tripTag} tone="warning" style={styles.headerBadge} />
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
                accessibilityLabel="Place name or location"
                value={query}
                onChangeText={changeQuery}
                placeholder="Search for a place"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={[styles.inputText, { color: theme.text }]}
              />
            </View>
            {hasSavedPlaces && <ScrollView
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
            </ScrollView>}
          </View>

          <View style={styles.field}>
            <ThemedText type="caption" style={styles.bold}>Street address (optional)</ThemedText>
            <View
              style={[
                styles.input,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Icon name="pin" size={14} color={theme.primary} />
              <TextInput
                accessibilityLabel="Street address"
                value={address}
                onChangeText={setAddress}
                placeholder="Add the place address"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                style={[styles.inputText, { color: theme.text }]}
              />
            </View>
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
          ) : null}

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
            <ThemedText type="caption" style={styles.bold}>Estimated cost (optional)</ThemedText>
            <View
              style={[
                styles.input,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <TextInput
                accessibilityLabel="Estimated cost"
                value={cost}
                onChangeText={setCost}
                placeholder="e.g. ¥2,000 or Free"
                placeholderTextColor={theme.textSecondary}
                style={[styles.inputText, { color: theme.text }]}
              />
            </View>
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
                <Avatar member={me} size={18} />
                <ThemedText type="caption" style={styles.bold}>
                  {me.name}
                  {isOrganizer ? ' (Organizer)' : ''}
                </ThemedText>
              </View>
              <TextInput
                accessibilityLabel="Recommendation note"
                value={note}
                onChangeText={setNote}
                maxLength={NOTE_LIMIT}
                multiline
                placeholder="Tell the group what makes this worth a stop."
                placeholderTextColor={theme.textSecondary}
                style={[styles.noteInput, { color: theme.text }]}
              />
              <ThemedText type="mono" themeColor="textSecondary" style={styles.counter}>
                {note.length}/{NOTE_LIMIT}
              </ThemedText>
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
        {error && (
          <ThemedText type="caption" themeColor="warning" style={styles.footerError}>
            {error}
          </ThemedText>
        )}
        <View style={styles.footerInner}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancel}
          />
          <Button
            label={saving ? 'Saving…' : 'Add to Ideas'}
            icon="plusCircle"
            disabled={!title || saving}
            onPress={submit}
            style={styles.submit}
          />
        </View>
      </View>
    </PageTransition>
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
  counter: { alignSelf: 'flex-end' },
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
  footerError: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.two,
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
