import { StyleSheet, Text, View } from 'react-native';

import { useAppData } from '@/src/data';
import { colors, spacing, typography } from '@/src/theme';

export function BackupStatusRow() {
  const { data } = useAppData();
  const lastBackupAt = data.meta?.lastBackupAt ?? null;

  const { primary, secondary } = formatStatus(lastBackupAt);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>LAST BACKUP</Text>
      <Text style={styles.primary}>{primary}</Text>
      {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
    </View>
  );
}

function formatStatus(iso: string | null): { primary: string; secondary: string } {
  if (!iso) {
    return { primary: 'Never', secondary: 'Tap "Export data" to make your first backup' };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { primary: 'Unknown', secondary: '' };
  }
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.round(diff / 60_000);
  const hours = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);

  let primary: string;
  if (minutes < 1) primary = 'Just now';
  else if (minutes < 60) primary = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  else if (hours < 24) primary = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  else if (days < 7) primary = `${days} ${days === 1 ? 'day' : 'days'} ago`;
  else primary = `${days} days ago`;

  const absolute = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  return { primary, secondary: absolute };
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  label: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
  },
  primary: {
    ...typography.subhead,
    color: colors.ink,
  },
  secondary: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
