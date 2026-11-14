/**
 * Design tokens for TravelWise. Colors are defined for both light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1B24',
    textSecondary: '#5C5F6E',
    background: '#F5F4FC',
    surface: '#FFFFFF',
    backgroundElement: '#ECEAF8',
    backgroundSelected: '#DEDBF2',
    border: '#E3E1F0',
    primary: '#00695C',
    onPrimary: '#FFFFFF',
    primarySoft: '#D9F2EC',
    accent: '#8CF2D8',
    accentText: '#00513F',
    warning: '#D9540B',
    warningSoft: '#FFE3D0',
    info: '#2F64B5',
    infoSoft: '#DCE6FA',
    heart: '#E5484D',
    mapLand: '#E9EEE6',
    mapWater: '#CFE3F2',
    mapRoad: '#FFFFFF',
    mapPark: '#D5EAD3',
  },
  dark: {
    text: '#F2F1FA',
    textSecondary: '#A9ABBB',
    background: '#111118',
    surface: '#1B1B24',
    backgroundElement: '#262633',
    backgroundSelected: '#33334A',
    border: '#2E2E3D',
    primary: '#4FD1B5',
    onPrimary: '#00382F',
    primarySoft: '#123F37',
    accent: '#1F5E50',
    accentText: '#9FF5DE',
    warning: '#FF9A5C',
    warningSoft: '#4A2A14',
    info: '#8FB4F0',
    infoSoft: '#1E2D4A',
    heart: '#FF6B70',
    mapLand: '#20262B',
    mapWater: '#1A3345',
    mapRoad: '#343B42',
    mapPark: '#1F3A2C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

/** Space the tab bar takes up at the bottom of the screen (excluding the safe area). */
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 640;
