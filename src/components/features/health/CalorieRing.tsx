import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, spacing, typography } from '@/src/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({
  value,
  target,
}: {
  value: number;
  target: number;
}) {
  const reducedMotion = useReducedMotion();
  const progress = target > 0 ? Math.max(0, Math.min(value / target, 1.5)) : 0;
  const filled = useSharedValue(reducedMotion ? progress : 0);

  useEffect(() => {
    filled.value = withTiming(progress, { duration: reducedMotion ? 0 : 700 });
  }, [progress, reducedMotion, filled]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(filled.value, 1)),
  }));

  const remaining = Math.max(0, Math.round(target - value));
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.paperRecessed}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={progress >= 1 ? colors.sage : colors.clay}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.eyebrow}>CALORIES</Text>
        <Text style={styles.value}>{Math.round(value).toLocaleString('en-IN')}</Text>
        <Text style={styles.target}>of {target.toLocaleString('en-IN')} kcal</Text>
        <Text style={styles.foot}>
          {remaining > 0 ? `${remaining.toLocaleString('en-IN')} left` : `${percent}% of goal`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SIZE,
    width: SIZE,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    gap: 2,
  },
  eyebrow: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  value: {
    ...typography.hero,
    color: colors.ink,
    fontSize: 52,
    lineHeight: 56,
  },
  target: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  foot: {
    ...typography.metricSm,
    color: colors.clay,
    marginTop: 2,
  },
});
