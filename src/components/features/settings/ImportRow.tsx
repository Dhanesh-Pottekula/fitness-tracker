import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { parseBackup } from '@/src/lib/backup';
import { mergeAppData, summarizeMerge } from '@/src/lib/merge';
import type { MergeStats } from '@/src/lib/merge';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ImportRow() {
  const { data, setData } = useAppData();

  async function handleImport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Import a backup?',
        'It will be merged with your current data. Nothing will be deleted.',
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

    const stats = summarizeMerge(data, result.envelope.data);
    const exportedDateLabel = result.envelope._exportedAt
      ? new Intl.DateTimeFormat('en-IN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(result.envelope._exportedAt))
      : 'Unknown date';
    const summaryMessage = formatMergeSummary(exportedDateLabel, stats);

    const confirmMerge = await new Promise<boolean>((resolve) => {
      Alert.alert('Merge backup?', summaryMessage, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Merge', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmMerge) return;

    setData((prev) => mergeAppData(prev, result.envelope.data));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Alert.alert('Backup merged', 'Your backup has been merged with your data.');
  }

  return (
    <PressableOpacity onPress={handleImport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.bloomTint }]}>
        <Ionicons name="arrow-down-circle-outline" size={22} color={colors.bloom} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Import data</Text>
        <Text style={styles.subtitle}>
          Merge a backup file with your current data. Nothing is deleted.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
}

function formatMergeSummary(dateLabel: string, stats: MergeStats): string {
  const addParts: string[] = [];
  if (stats.added.transactions > 0) {
    addParts.push(
      `${stats.added.transactions} ${stats.added.transactions === 1 ? 'transaction' : 'transactions'}`,
    );
  }
  if (stats.added.cycleDays > 0) {
    addParts.push(`${stats.added.cycleDays} cycle ${stats.added.cycleDays === 1 ? 'day' : 'days'}`);
  }
  if (stats.added.meals > 0) {
    addParts.push(`${stats.added.meals} ${stats.added.meals === 1 ? 'meal' : 'meals'}`);
  }
  if (stats.added.foods > 0) {
    addParts.push(`${stats.added.foods} ${stats.added.foods === 1 ? 'food' : 'foods'}`);
  }
  if (stats.added.loans > 0) {
    addParts.push(`${stats.added.loans} ${stats.added.loans === 1 ? 'loan' : 'loans'}`);
  }
  if (stats.added.mealTemplates > 0) {
    addParts.push(
      `${stats.added.mealTemplates} ${stats.added.mealTemplates === 1 ? 'meal template' : 'meal templates'}`,
    );
  }

  const existingParts: string[] = [];
  if (stats.existing.transactions > 0) {
    existingParts.push(
      `${stats.existing.transactions} ${stats.existing.transactions === 1 ? 'transaction' : 'transactions'}`,
    );
  }
  if (stats.existing.cycleDays > 0) {
    existingParts.push(
      `${stats.existing.cycleDays} cycle ${stats.existing.cycleDays === 1 ? 'day' : 'days'}`,
    );
  }
  if (stats.existing.meals > 0) {
    existingParts.push(
      `${stats.existing.meals} ${stats.existing.meals === 1 ? 'meal' : 'meals'}`,
    );
  }

  const lines: string[] = [`From ${dateLabel}`];
  lines.push(addParts.length > 0 ? `Will add: ${addParts.join(' · ')}` : 'Nothing new to add.');
  if (existingParts.length > 0) {
    lines.push(`Already present: ${existingParts.join(' · ')}`);
  }
  lines.push('Nothing will be deleted.');
  return lines.join('\n\n');
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
