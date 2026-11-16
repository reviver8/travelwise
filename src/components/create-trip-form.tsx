import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Spacing } from '@/constants/theme';
import { errorMessage, useTripState } from '@/context/trip-context';

export function CreateTripForm({ onCreated }: { onCreated?: () => void }) {
  const { createTrip } = useTripState();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const canCreate = !saving && !!name.trim() && !!destination.trim() && !!startDate.trim() && !!endDate.trim();

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    setError(undefined);
    try {
      await createTrip({
        name: name.trim(),
        destination: destination.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      });
      onCreated?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <ThemedText type="heading">Create a trip</ThemedText>
      <Field
        label="Trip name"
        value={name}
        onChangeText={setName}
        placeholder="Summer in Japan"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <Field
        label="Destination"
        value={destination}
        onChangeText={setDestination}
        placeholder="Tokyo, Japan"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Field
            label="Start date"
            hint="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2027-05-14"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            returnKeyType="next"
          />
        </View>
        <View style={styles.dateField}>
          <Field
            label="End date"
            hint="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2027-05-21"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={create}
          />
        </View>
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        You’ll be the organizer. Invite your group from the trip overview.
      </ThemedText>
      <Button
        label={saving ? 'Creating trip…' : 'Create Trip'}
        disabled={!canCreate}
        onPress={create}
      />
      {error && (
        <ThemedText type="caption" themeColor="warning" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three - 4 },
  dateRow: { flexDirection: 'row', gap: Spacing.two },
  dateField: { flex: 1, minWidth: 0 },
});
