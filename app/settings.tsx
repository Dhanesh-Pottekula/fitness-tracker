import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableOpacity } from '@/src/components/ui';
import {
  BackupStatusRow,
  ExportRow,
  ImportRow,
  SettingsCard,
} from '@/src/components/features/settings';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <PressableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </PressableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsCard kicker="Backup">
          <BackupStatusRow />
          <ExportRow />
          <ImportRow />
        </SettingsCard>

        <Text style={styles.footnote}>
          Backups are saved as JSON files. To survive uninstall, save them to iCloud Drive,
          Google Drive, or Files.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  footnote: {
    ...typography.caption,
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
