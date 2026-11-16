import { useFocusEffect } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type PageTransitionProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
};

export function PageTransition({ children, style, enabled = true }: PageTransitionProps) {
  const progress = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animate = enabled && !reduceMotion;

  useFocusEffect(
    useCallback(() => {
      if (!animate) return;

      progress.set(0);
      progress.set(
        withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        })
      );

      return () => {
        cancelAnimation(progress);
        progress.set(1);
      };
    }, [animate, progress])
  );

  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: 0.55 + value * 0.45,
      transform: [{ translateY: (1 - value) * 6 }],
    };
  });

  return (
    <Animated.View style={[style, animate && animatedStyle]}>
      {children}
    </Animated.View>
  );
}
