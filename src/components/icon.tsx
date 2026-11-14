import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import type { IdeaCategory } from '@/data/trip';
import { useTheme } from '@/hooks/use-theme';

type PlatformSymbol = Extract<SymbolViewProps['name'], object>;

/** SF Symbol on iOS, Material Symbol on Android and web. */
const symbol = (
  ios: NonNullable<PlatformSymbol['ios']>,
  material: NonNullable<PlatformSymbol['android']>
) => ({ ios, android: material, web: material });

const ICONS = {
  logo: symbol('safari', 'explore'),
  overview: symbol('square.grid.2x2', 'grid_view'),
  idea: symbol('lightbulb', 'lightbulb'),
  vote: symbol('checklist', 'how_to_vote'),
  calendar: symbol('calendar', 'calendar_month'),
  person: symbol('person.fill', 'person'),
  group: symbol('person.2', 'group'),
  invite: symbol('person.badge.plus', 'person_add'),
  chevronDown: symbol('chevron.down', 'expand_more'),
  chevronRight: symbol('chevron.right', 'chevron_right'),
  arrowRight: symbol('arrow.right', 'chevron_right'),
  openExternal: symbol('arrow.up.right', 'open_in_new'),
  pin: symbol('mappin.and.ellipse', 'location_on'),
  addPlace: symbol('mappin.circle', 'add_location_alt'),
  map: symbol('map', 'map'),
  route: symbol('arrow.triangle.turn.up.right.diamond', 'route'),
  cards: symbol('rectangle.grid.1x2', 'view_agenda'),
  search: symbol('magnifyingglass', 'search'),
  heart: symbol('heart', 'favorite'),
  heartFill: symbol('heart.fill', 'favorite'),
  food: symbol('fork.knife', 'restaurant'),
  entertainment: symbol('sparkles', 'auto_awesome'),
  attractions: symbol('building.columns', 'museum'),
  shopping: symbol('bag', 'shopping_bag'),
  outdoors: symbol('leaf', 'park'),
  check: symbol('checkmark', 'check'),
  checkCircle: symbol('checkmark.circle', 'check_circle'),
  close: symbol('xmark', 'close'),
  plusCircle: symbol('plus.circle.fill', 'add_circle'),
  train: symbol('tram.fill', 'directions_subway'),
  walk: symbol('figure.walk', 'directions_walk'),
  clock: symbol('clock', 'schedule'),
  star: symbol('star.fill', 'star'),
  photo: symbol('photo', 'image'),
  camera: symbol('camera', 'photo_camera'),
} satisfies Record<string, PlatformSymbol>;

export type IconName = keyof typeof ICONS;

export const CATEGORY_ICON: Record<IdeaCategory, IconName> = {
  'Food & Drink': 'food',
  Entertainment: 'entertainment',
  Attractions: 'attractions',
  Shopping: 'shopping',
  Outdoors: 'outdoors',
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 16, color, style }: IconProps) {
  const theme = useTheme();
  return <SymbolView name={ICONS[name]} size={size} tintColor={color ?? theme.text} style={style} />;
}
