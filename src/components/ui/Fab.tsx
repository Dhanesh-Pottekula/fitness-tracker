import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/src/theme';

import { PressableOpacity } from './PressableOpacity';

export function Fab({ onPress, style }: { onPress: () => void; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel="Add"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      style={[styles.fab, { bottom: insets.bottom + spacing.lg }, style]}>
      <Ionicons name="add" color={colors.paperRaised} size={30} />
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    alignItems: 'center',
    backgroundColor: colors.clay,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.lg,
    width: 56,
  },
});
