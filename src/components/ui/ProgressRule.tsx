import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/src/theme';

export function ProgressRule({ progress, target = 1 }: { progress: number; target?: number }) {
  const width = `${Math.max(0, Math.min(progress, 1)) * 100}%` as const;
  const markerLeft = `${Math.max(0, Math.min(target, 1)) * 100}%` as const;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width }]} />
      <View style={[styles.marker, { left: markerLeft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.pill,
    height: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    backgroundColor: colors.clay,
    height: '100%',
  },
  marker: {
    backgroundColor: colors.target,
    height: 8,
    marginLeft: -0.5,
    position: 'absolute',
    top: -2,
    width: StyleSheet.hairlineWidth,
  },
});
