import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { colors, radius, spacing, typography } from '@/src/theme';

const STALE_THRESHOLD_DAYS = 30;

export function StaleBackupChip({ style }: { style?: object }) {
  const router = useRouter();
  const { data } = useAppData();
  const lastBackupAt = data.meta?.lastBackupAt ?? null;

  if (!lastBackupAt) return null;

  const date = new Date(lastBackupAt);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < STALE_THRESHOLD_DAYS) return null;

  function open() {
    Haptics.selectionAsync().catch(() => undefined);
    router.push('/settings');
  }

  return (
    <PressableOpacity onPress={open} style={[styles.chip, style]}>
      <Ionicons name="time-outline" size={14} color={colors.ochre} />
      <Text style={styles.text} numberOfLines={1}>
        Backup is {days} days old
      </Text>
      <Text style={styles.hint}>· Tap to back up</Text>
      <View style={styles.spacer} />
      <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: '#fdf3d6',
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.ink,
  },
  hint: {
    ...typography.caption,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
});
