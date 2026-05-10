import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { PressableOpacity } from '@/src/components/ui';
import type { CycleDayEntry } from '@/src/data/types';
import {
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  flowColor,
  flowLabel,
} from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

export function DayPreviewPanel({
  iso,
  entry,
  onEdit,
}: {
  iso: string;
  entry: CycleDayEntry;
  onEdit: () => void;
}) {
  const mood = MOOD_OPTIONS.find((m) => m.value === entry.mood);
  const symptoms =
    entry.symptoms?.map((s) => SYMPTOM_OPTIONS.find((opt) => opt.value === s)?.label).filter(
      (label): label is string => Boolean(label),
    ) ?? [];

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.dateLabel}>{formatDate(iso)}</Text>
        <PressableOpacity onPress={onEdit} style={styles.editBtn} hitSlop={6}>
          <Text style={styles.editText}>Edit</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.clay} />
        </PressableOpacity>
      </View>

      <View style={styles.rows}>
        {entry.flow ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>FLOW</Text>
            <View style={styles.flowChip}>
              <View style={[styles.flowDot, { backgroundColor: flowColor(entry.flow) }]} />
              <Text style={styles.flowText}>{flowLabel(entry.flow)}</Text>
            </View>
          </View>
        ) : null}

        {mood ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>MOOD</Text>
            <View style={styles.moodPill}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </View>
          </View>
        ) : null}

        {symptoms.length > 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>SYMPTOMS</Text>
            <View style={styles.symptomWrap}>
              {symptoms.map((label) => (
                <View key={label} style={styles.symptomChip}>
                  <Text style={styles.symptomText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {entry.note ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>NOTE</Text>
            <Text style={styles.noteText}>{entry.note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, m - 1, d));
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLabel: {
    ...typography.subhead,
    color: colors.ink,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  editText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.clay,
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowLabel: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
    width: 70,
    paddingTop: 4,
  },
  flowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paperRecessed,
  },
  flowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flowText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.ink,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paperRecessed,
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.ink,
  },
  symptomWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  symptomChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.paperRecessed,
  },
  symptomText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkSoft,
  },
  noteText: {
    ...typography.body,
    fontSize: 13,
    color: colors.inkSoft,
    flex: 1,
  },
});
