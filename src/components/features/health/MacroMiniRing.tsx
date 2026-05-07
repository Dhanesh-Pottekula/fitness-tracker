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

const SIZE = 88;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MacroMiniRing({
  label,
  value,
  target,
  unit = 'g',
  color,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
}) {
  const reducedMotion = useReducedMotion();
  const progress = target > 0 ? Math.max(0, Math.min(value / target, 1.5)) : 0;
  const filled = useSharedValue(reducedMotion ? progress : 0);

  useEffect(() => {
    filled.value = withTiming(progress, { duration: reducedMotion ? 0 : 600 });
  }, [progress, reducedMotion, filled]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - Math.min(filled.value, 1)),
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.ringWrap}>
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
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            fill="none"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          <Text style={styles.value}>{Math.round(value)}</Text>
          <Text style={styles.target}>/{target}{unit}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xxs,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SIZE,
    width: SIZE,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    ...typography.metric,
    fontSize: 18,
    lineHeight: 20,
    color: colors.ink,
  },
  target: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  label: {
    ...typography.kicker,
    color: colors.inkMuted,
    marginTop: spacing.xxs,
  },
});
