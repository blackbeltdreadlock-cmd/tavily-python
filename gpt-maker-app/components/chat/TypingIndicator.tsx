import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColor';

export function TypingIndicator() {
  const colors = useThemeColors();
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const animation = (delay: number) =>
      withRepeat(
        withDelay(delay, withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 }))),
        -1,
      );

    dot1.value = animation(0);
    dot2.value = animation(150);
    dot3.value = animation(300);
  }, []);

  const animStyle = (dot: SharedValue<number>) =>
    useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: 0.7 + dot.value * 0.3 }] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: colors.textSecondary }, animStyle(dot)]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginLeft: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
