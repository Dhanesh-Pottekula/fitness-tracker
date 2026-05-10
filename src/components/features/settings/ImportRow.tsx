import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { parseBackup, summarizeEnvelope } from '@/src/lib/backup';
import type { BackupSummary } from '@/src/lib/backup';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ImportRow() {
  const { setData } = useAppData();

  async function handleImport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Import a backup?',
        'This will replace all current data. You cannot undo this.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ],
      );
    });
    if (!proceed) return;

    let pickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
    } catch (error) {
      console.warn('Document picker failed', error);
      Alert.alert('Could not open file picker', String(error instanceof Error ? error.message : error));
      return;
    }

    if (pickerResult.canceled) return;
    const asset = pickerResult.assets?.[0];
    if (!asset) return;

    let text: string;
    try {
      text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      Alert.alert('Could not read file', String(error instanceof Error ? error.message : error));
      return;
    }

    const result = parseBackup(text);
    if (!result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert('Invalid backup', result.error);
      return;
    }

    const summary = summarizeEnvelope(result.envelope);
    const summaryLine = formatSummary(summary);

    const confirmReplace = await new Promise<boolean>((resolve) => {
      Alert.alert('Replace current data?', summaryLine, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmReplace) return;

    setData(result.envelope.data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Alert.alert('Data imported', 'Your backup has been restored.');
  }

  return (
    <PressableOpacity onPress={handleImport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.bloomTint }]}>
        <Ionicons name="arrow-down-circle-outline" size={22} color={colors.bloom} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Import data</Text>
        <Text style={styles.subtitle}>Replace current data with a backup file.</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

function formatSummary(summary: BackupSummary): string {
  const dateLabel = summary.exportedAt
    ? new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(summary.exportedAt))
    : 'Unknown date';
  const parts = [
    `${summary.cycleDays} cycle ${summary.cycleDays === 1 ? 'day' : 'days'}`,
    `${summary.periods} ${summary.periods === 1 ? 'period' : 'periods'}`,
    `${summary.transactions} ${summary.transactions === 1 ? 'transaction' : 'transactions'}`,
    `${summary.meals} ${summary.meals === 1 ? 'meal' : 'meals'}`,
  ];
  return `Backup from ${dateLabel}\n\n${parts.join(' · ')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.subhead,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
