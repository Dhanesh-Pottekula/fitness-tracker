import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CycleStatusStrip } from '@/src/components/features/cycle';
import { FoodPickerSheet } from '@/src/components/features/health';
import { StaleBackupChip } from '@/src/components/features/settings';
import { SpendForm } from '@/src/components/features/spends/SpendForm';
import { Kicker, PressableOpacity, ProgressRule } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { formatINR } from '@/src/lib/currency';
import { formatDayHeading, monthKeyFromDate, todayIso } from '@/src/lib/date';
import {
  entryIsoDate,
  entrySignedAmount,
  getFriendBalances,
  isEarning,
  isSpend,
} from '@/src/lib/monthly-spends';
import { dayMacros, foodsById } from '@/src/lib/physical-health';
import { colors, radius, spacing, typography } from '@/src/theme';

export default function HomeScreen() {
  const { data } = useAppData();
  const router = useRouter();
  const today = todayIso();
  const monthKey = monthKeyFromDate();

  const [mealSheetOpen, setMealSheetOpen] = useState(false);
  const [moneySheetOpen, setMoneySheetOpen] = useState(false);

  // ───────────── Health summary ─────────────
  const targets = data.physicalHealth.targets;
  const todayEntry = data.physicalHealth.daily[today] ?? { water: 0, weight: 0, meals: [] };
  const foodsByIdMap = useMemo(
    () => foodsById(data.physicalHealth.foods),
    [data.physicalHealth.foods],
  );
  const macros = useMemo(() => dayMacros(todayEntry, foodsByIdMap), [todayEntry, foodsByIdMap]);
  const kcalProgress = targets.calories > 0 ? Math.min(macros.kcal / targets.calories, 1) : 0;
  const kcalRemaining = Math.max(0, Math.round(targets.calories - macros.kcal));
  const mealCount = todayEntry.meals.length;

  // ───────────── Money summary (lifetime, all transactions including friend-tagged) ─────────────
  const allEntries = useMemo(
    () => Object.values(data.monthlySpends).flat(),
    [data.monthlySpends],
  );
  const earnings = allEntries.filter(isEarning);
  const spends = allEntries.filter(isSpend);
  const earned = earnings.reduce((s, e) => s + entrySignedAmount(e), 0);
  const spent = spends.reduce((s, e) => s + Math.abs(entrySignedAmount(e)), 0);
  const balance = earned - spent;
  const earnedRatio = earned + spent > 0 ? earned / (earned + spent) : 0;
  const todayTxnCount = useMemo(
    () => allEntries.filter((e) => entryIsoDate(e) === today).length,
    [allEntries, today],
  );

  // ───────────── Friends ─────────────
  const friendBalances = useMemo(
    () => getFriendBalances(data.monthlySpends),
    [data.monthlySpends],
  );
  const outstanding = friendBalances.filter((f) => f.balance !== 0);
  const topOutstanding = outstanding.slice(0, 3);
  const moreOutstanding = outstanding.length - topOutstanding.length;

  // ───────────── Greeting ─────────────
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? 'Burning the midnight oil'
      : hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
            <Text style={styles.heading}>{formatDayHeading(today)}</Text>
          </View>
          <PressableOpacity
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              router.push('/settings');
            }}
            style={styles.settingsBtn}
            hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={colors.ink} />
          </PressableOpacity>
        </View>

        <StaleBackupChip style={styles.staleChip} />

        <CycleStatusStrip style={styles.cycleStrip} />

        {/* ───────────── Health pulse card ───────────── */}
        <View style={styles.pulseCard}>
          <View style={styles.pulseHead}>
            <View style={styles.pulseTitleWrap}>
              <Text style={styles.pulseEyebrow}>TODAY · CALORIES</Text>
              <Text style={styles.pulseValue}>
                {Math.round(macros.kcal).toLocaleString('en-IN')}
                <Text style={styles.pulseValueUnit}>
                  {' '}
                  / {targets.calories.toLocaleString('en-IN')}
                </Text>
              </Text>
            </View>
            <View style={[styles.pulsePctPill, { borderColor: colors.clay }]}>
              <Text style={[styles.pulsePctText, { color: colors.clay }]}>
                {Math.round(kcalProgress * 100)}%
              </Text>
            </View>
          </View>

          <ProgressRule progress={kcalProgress} />

          <View style={styles.macroRow}>
            <MacroChip label="P" value={macros.protein} target={targets.protein} color={colors.sage} />
            <MacroChip label="C" value={macros.carbs} target={targets.carbs} color={colors.ochre} />
            <MacroChip label="F" value={macros.fats} target={targets.fats} color={colors.slate} />
          </View>

          <View style={styles.pulseFoot}>
            <Text style={styles.pulseFootText}>
              {mealCount === 0
                ? 'No meals yet today'
                : `${mealCount} ${mealCount === 1 ? 'meal' : 'meals'} · ${kcalRemaining.toLocaleString('en-IN')} kcal left`}
            </Text>
            <PressableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                setMealSheetOpen(true);
              }}
              style={[styles.pulseCta, { backgroundColor: colors.clay }]}>
              <Ionicons name="add" size={16} color={colors.paperRaised} />
              <Text style={styles.pulseCtaText}>Log meal</Text>
            </PressableOpacity>
          </View>
        </View>

        {/* ───────────── Money pulse card ───────────── */}
        <View style={styles.pulseCard}>
          <View style={styles.pulseHead}>
            <View style={styles.pulseTitleWrap}>
              <Text style={styles.pulseEyebrow}>BALANCE</Text>
              <Text
                style={[
                  styles.pulseValue,
                  { color: balance >= 0 ? colors.success : colors.danger },
                ]}>
                {formatINR(balance, { signed: true })}
              </Text>
            </View>
            <View
              style={[
                styles.pulsePctPill,
                { borderColor: balance >= 0 ? colors.success : colors.danger },
              ]}>
              <Ionicons
                name={balance >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={balance >= 0 ? colors.success : colors.danger}
              />
            </View>
          </View>

          <View style={styles.tape}>
            <View style={[styles.tapeFill, { flex: earnedRatio, backgroundColor: colors.success }]} />
            <View
              style={[styles.tapeFill, { flex: 1 - earnedRatio, backgroundColor: colors.danger }]}
            />
          </View>

          <View style={styles.balanceLine}>
            <View style={styles.balancePill}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.balancePillText}>
                Earned <Text style={{ color: colors.success }}>{formatINR(earned)}</Text>
              </Text>
            </View>
            <View style={styles.balancePill}>
              <View style={[styles.dot, { backgroundColor: colors.danger }]} />
              <Text style={styles.balancePillText}>
                Spent <Text style={{ color: colors.danger }}>{formatINR(spent)}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.pulseFoot}>
            <Text style={styles.pulseFootText}>
              {todayTxnCount === 0
                ? 'No transactions today'
                : `${todayTxnCount} ${todayTxnCount === 1 ? 'transaction' : 'transactions'} today`}
            </Text>
            <PressableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                setMoneySheetOpen(true);
              }}
              style={[styles.pulseCta, { backgroundColor: colors.ink }]}>
              <Ionicons name="add" size={16} color={colors.paperRaised} />
              <Text style={styles.pulseCtaText}>Log money</Text>
            </PressableOpacity>
          </View>
        </View>

        {/* ───────────── Outstanding (friends) ───────────── */}
        {topOutstanding.length > 0 ? (
          <>
            <Kicker>Outstanding</Kicker>
            <View>
              {topOutstanding.map((friend) => {
                const isOwed = friend.balance > 0;
                const tone = isOwed ? colors.success : colors.danger;
                return (
                  <View key={friend.name} style={styles.outstandingRow}>
                    <View style={styles.outstandingLeft}>
                      <View style={[styles.dot, { backgroundColor: tone }]} />
                      <Text style={styles.outstandingName} numberOfLines={1}>
                        {isOwed ? `${friend.name} owes you` : `You owe ${friend.name}`}
                      </Text>
                    </View>
                    <Text style={[styles.outstandingAmount, { color: tone }]}>
                      {formatINR(Math.abs(friend.balance))}
                    </Text>
                  </View>
                );
              })}
              {moreOutstanding > 0 ? (
                <Link href="/(tabs)/spends" asChild>
                  <PressableOpacity style={styles.seeAllRow}>
                    <Text style={styles.seeAllText}>
                      +{moreOutstanding} more · See all in Spends
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
                  </PressableOpacity>
                </Link>
              ) : null}
            </View>
          </>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      <FoodPickerSheet
        visible={mealSheetOpen}
        date={today}
        mealIndex={null}
        onClose={() => setMealSheetOpen(false)}
      />
      <SpendForm
        visible={moneySheetOpen}
        monthKey={monthKey}
        onClose={() => setMoneySheetOpen(false)}
      />
    </SafeAreaView>
  );
}

function MacroChip({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const reached = target > 0 && value >= target;
  return (
    <View style={macroStyles.chip}>
      <Text style={[macroStyles.label, { color }]}>{label}</Text>
      <Text style={[macroStyles.value, reached && { color }]}>
        {Math.round(value)}
        <Text style={macroStyles.target}>/{target}g</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  greeting: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  pulseCard: {
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pulseHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pulseTitleWrap: { flex: 1, gap: 2 },
  pulseEyebrow: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.inkMuted,
  },
  pulseValue: {
    ...typography.hero,
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
  },
  pulseValueUnit: {
    ...typography.body,
    fontSize: 14,
    color: colors.inkMuted,
    fontWeight: '400',
  },
  pulsePctPill: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pulsePctText: {
    ...typography.metricSm,
    fontSize: 12,
    fontWeight: '700',
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pulseFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: 2,
  },
  pulseFootText: {
    ...typography.caption,
    color: colors.inkMuted,
    flex: 1,
  },
  pulseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  pulseCtaText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.paperRaised,
  },

  tape: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.paperRecessed,
  },
  tapeFill: { height: '100%' },
  balanceLine: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  balancePillText: {
    ...typography.caption,
    color: colors.inkSoft,
  },

  outstandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  outstandingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  outstandingName: {
    ...typography.subhead,
    color: colors.ink,
    fontSize: 14,
    flex: 1,
  },
  outstandingAmount: {
    ...typography.metric,
    fontSize: 16,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  seeAllText: {
    ...typography.caption,
    color: colors.inkMuted,
  },

  bottomPad: { height: 64 },
  cycleStrip: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  staleChip: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});

const macroStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: colors.paperRecessed,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    ...typography.kicker,
    fontSize: 9,
  },
  value: {
    ...typography.metric,
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  target: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkMuted,
  },
});
