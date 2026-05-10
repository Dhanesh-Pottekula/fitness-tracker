import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { defaultBackupFileName, serializeBackup } from '@/src/lib/backup';
import { colors, radius, spacing, typography } from '@/src/theme';

export function ExportRow() {
  const { data, setData } = useAppData();

  async function handleExport() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    try {
      const json = serializeBackup(data);
      const fileName = defaultBackupFileName();
      const uri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', `Your backup is saved at:\n${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save backup',
        UTI: 'public.json',
      });

      setData((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          lastBackupAt: new Date().toISOString(),
        },
      }));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (error) {
      console.warn('Export failed', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      Alert.alert('Export failed', String(error instanceof Error ? error.message : error));
    }
  }

  return (
    <PressableOpacity onPress={handleExport} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.successTint }]}>
        <Ionicons name="arrow-up-circle-outline" size={22} color={colors.success} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Export data</Text>
        <Text style={styles.subtitle}>
          Save a backup file. Share to Files, iCloud Drive, or any cloud storage.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
    </PressableOpacity>
  );
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
