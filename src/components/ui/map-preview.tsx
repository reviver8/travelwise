import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MapPin = {
  id: string;
  /** Position in percent of the map's width / height. */
  x: number;
  y: number;
  label?: string;
};

type MapPreviewProps = {
  pins?: MapPin[];
  height?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const ROADS = [
  { top: '22%', left: '-10%', width: '120%', rotate: '-8deg', thickness: 5 },
  { top: '58%', left: '-10%', width: '120%', rotate: '6deg', thickness: 6 },
  { top: '84%', left: '-10%', width: '120%', rotate: '-3deg', thickness: 3 },
  { top: '40%', left: '-30%', width: '120%', rotate: '72deg', thickness: 4 },
  { top: '45%', left: '10%', width: '120%', rotate: '-64deg', thickness: 5 },
  { top: '50%', left: '30%', width: '120%', rotate: '84deg', thickness: 3 },
] as const;

/**
 * A stylized, non-interactive map drawn with plain views.
 * Placeholder until a real map provider (for example expo-maps) is wired up.
 */
export function MapPreview({ pins = [], height = 140, style, children }: MapPreviewProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Map preview"
      style={[styles.map, { height, backgroundColor: theme.mapLand }, style]}>
      <View style={[styles.water, { backgroundColor: theme.mapWater }]} />
      <View style={[styles.park, styles.parkOne, { backgroundColor: theme.mapPark }]} />
      <View style={[styles.park, styles.parkTwo, { backgroundColor: theme.mapPark }]} />
      {ROADS.map((road, index) => (
        <View
          key={index}
          style={[
            styles.road,
            {
              top: road.top,
              left: road.left,
              width: road.width,
              height: road.thickness,
              backgroundColor: theme.mapRoad,
              transform: [{ rotate: road.rotate }],
            },
          ]}
        />
      ))}
      {pins.map((pin) => (
        <View key={pin.id} style={[styles.pinAnchor, { left: `${pin.x}%`, top: `${pin.y}%` }]}>
          <View
            style={[styles.pin, { backgroundColor: theme.primary, borderColor: theme.surface }]}
          />
          {pin.label && (
            <View style={[styles.pinLabel, { backgroundColor: theme.surface }]}>
              <ThemedText type="mono" numberOfLines={1}>
                {pin.label}
              </ThemedText>
            </View>
          )}
        </View>
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    overflow: 'hidden',
    borderRadius: Radius.medium,
  },
  water: {
    position: 'absolute',
    right: '-12%',
    bottom: '-30%',
    width: '55%',
    height: '75%',
    borderRadius: 80,
    transform: [{ rotate: '-18deg' }],
  },
  park: {
    position: 'absolute',
    borderRadius: 24,
  },
  parkOne: {
    left: '8%',
    top: '28%',
    width: '18%',
    height: '24%',
  },
  parkTwo: {
    left: '46%',
    top: '8%',
    width: '14%',
    height: '16%',
  },
  road: {
    position: 'absolute',
    borderRadius: 3,
  },
  pinAnchor: {
    position: 'absolute',
    alignItems: 'center',
    width: 120,
    marginLeft: -60,
    marginTop: -7,
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  pinLabel: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
});
