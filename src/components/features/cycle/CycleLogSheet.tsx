import * as Haptics from 'expo-haptics';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { CycleDayEntry, FlowLevel, Mood, Symptom } from '@/src/data/types';
import {
  FLOW_LEVELS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  flowColor,
  flowLabel,
} from '@/src/lib/cycle';
import { colors, radius, spacing, typography } from '@/src/theme';

export function CycleLogSheet({
  visible,
  date,
  onClose,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
}) {
  const { data, setData } = useAppData();
  const entry: CycleDayEntry = data.cycle.daily[date] ?? {};
  const isPeriod = Boolean(entry.flow);

  function writeEntry(next: CycleDayEntry) {
    const cleaned: CycleDayEntry = {};
    if (next.flow) cleaned.flow = next.flow;
    if (next.mood) cleaned.mood = next.mood;
    if (next.symptoms && next.symptoms.length > 0) cleaned.symptoms = next.symptoms;
    if (next.note && next.note.trim().length > 0) cleaned.note = next.note.trim();

    const isEmpty = Object.keys(cleaned).length === 0;

    setData((prev) => {
      const dailyNext = { ...prev.cycle.daily };
      if (isEmpty) {
        delete dailyNext[date];
      } else {
        dailyNext[date] = cleaned;
      }
      return {
        ...prev,
        cycle: {
          ...prev.cycle,
          daily: dailyNext,
        },
      };
    });
  }

  function findYesterdayFlow(): FlowLevel | undefined {
    const [y, m, d] = date.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const py = prev.getFullYear();
    const pm = String(prev.getMonth() + 1).padStart(2, '0');
    const pd = String(prev.getDate()).padStart(2, '0');
    const isoPrev = `${py}-${pm}-${pd}`;
    return data.cycle.daily[isoPrev]?.flow;
  }

  function togglePeriod() {
    Haptics.selectionAsync().catch(() => undefined);
    if (isPeriod) {
      writeEntry({ ...entry, flow: undefined });
    } else {
      const fallback: FlowLevel = findYesterdayFlow() ?? 'medium';
      writeEntry({ ...entry, flow: fallback });
    }
  }

  function setFlow(level: FlowLevel) {
    Haptics.selectionAsync().catch(() => undefined);
    writeEntry({ ...entry, flow: level });
  }

  function setMood(mood: Mood) {
    Haptics.selectionAsync().catch(() => undefined);
    const next = entry.mood === mood ? undefined : mood;
    writeEntry({ ...entry, mood: next });
  }

  function toggleSymptom(symptom: Symptom) {
    Haptics.selectionAsync().catch(() => undefined);
    const current = entry.symptoms ?? [];
    const next = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];
    writeEntry({ ...entry, symptoms: next });
  }

  function setNote(note: string) {
    writeEntry({ ...entry, note });
  }

  function clearDay() {
    Alert.alert('Clear all data for this day?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          writeEntry({});
        },
      },
    ]);
  }

  return (
    <BottomSheet visible={visible} title={formatDateLabel(date)} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>PERIOD</Text>
        <PressableOpacity
          onPress={togglePeriod}
          style={[
            styles.periodToggle,
            isPeriod && { backgroundColor: colors.bloom, borderColor: colors.bloom },
          ]}>
          <View
            style={[
              styles.periodCheck,
              isPeriod && { borderColor: colors.paperRaised, backgroundColor: colors.paperRaised },
            ]}>
            {isPeriod ? <View style={[styles.periodCheckDot, { backgroundColor: colors.bloom }]} /> : null}
          </View>
          <Text style={[styles.periodToggleText, isPeriod && { color: colors.paperRaised }]}>
            {isPeriod ? 'Period today' : 'Mark as period day'}
          </Text>
        </PressableOpacity>

        {isPeriod ? (
          <View style={styles.flowRow}>
            {FLOW_LEVELS.map((level) => {
              const selected = entry.flow === level;
              return (
                <PressableOpacity
                  key={level}
                  onPress={() => setFlow(level)}
                  style={[
                    styles.flowChip,
                    selected && { backgroundColor: flowColor(level), borderColor: flowColor(level) },
                  ]}>
                  <Text style={[styles.flowChipText, selected && { color: colors.paperRaised }]}>
                    {flowLabel(level)}
                  </Text>
                </PressableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>MOOD</Text>
        <View style={styles.moodRow}>
          {MOOD_OPTIONS.map((option) => {
            const selected = entry.mood === option.value;
            return (
              <PressableOpacity
                key={option.value}
                onPress={() => setMood(option.value)}
                style={[
                  styles.moodChip,
                  selected && { backgroundColor: colors.sage, borderColor: colors.sage },
                ]}>
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodLabel, selected && { color: colors.paperRaised }]}>
                  {option.label}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>SYMPTOMS</Text>
        <View style={styles.symptomGrid}>
          {SYMPTOM_OPTIONS.map((option) => {
            const selected = entry.symptoms?.includes(option.value) ?? false;
            return (
              <PressableOpacity
                key={option.value}
                onPress={() => toggleSymptom(option.value)}
                style={[
                  styles.symptomChip,
                  selected && { backgroundColor: colors.slate, borderColor: colors.slate },
                ]}>
                <Text style={[styles.symptomChipText, selected && { color: colors.paperRaised }]}>
                  {option.label}
                </Text>
              </PressableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>NOTE</Text>
        <TextInput
          value={entry.note ?? ''}
          onChangeText={setNote}
          placeholder="Anything to remember?"
          placeholderTextColor={colors.inkMuted}
          style={styles.noteInput}
          maxLength={200}
        />

        <View style={styles.footer}>
          <PressableOpacity onPress={clearDay} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear day</Text>
          </PressableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function formatDateLabel(iso: string): string {
  const todayDate = new Date();
  const todayY = todayDate.getFullYear();
  const todayM = String(todayDate.getMonth() + 1).padStart(2, '0');
  const todayD = String(todayDate.getDate()).padStart(2, '0');
  const todayIsoLocal = `${todayY}-${todayM}-${todayD}`;
  if (iso === todayIsoLocal) return 'TODAY';

  const [y, m, d] = iso.split('-').map(Number);
  const yesterday = new Date(todayY, todayDate.getMonth(), todayDate.getDate() - 1);
  const yIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (iso === yIso) return 'YESTERDAY';

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(y, m - 1, d))
    .toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.kicker,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
  },
  periodCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.bloom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCheckDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  periodToggleText: {
    ...typography.subhead,
    color: colors.ink,
  },
  flowRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  flowChip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowChipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
  },
  moodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  moodChip: {
    paddingHorizontal: spacing.sm,
    minHeight: 56,
    minWidth: 64,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkSoft,
  },
  symptomGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  symptomChip: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    backgroundColor: colors.paperRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
  },
  noteInput: {
    ...typography.body,
    color: colors.ink,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  clearBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clearBtnText: {
    ...typography.caption,
    color: colors.inkMuted,
  },
});
