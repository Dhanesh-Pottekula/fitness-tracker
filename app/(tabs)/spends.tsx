import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SpendForm } from '@/src/components/features/spends/SpendForm';
import { Fab, Hero, Kicker, Page } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { formatINR } from '@/src/lib/currency';
import { formatMonthLabel, monthKeyFromDate } from '@/src/lib/date';
import { getMoneyMovement, sortSpendEntries, summarizeSpendEntries } from '@/src/lib/monthly-spends';
import { colors, spacing, typography } from '@/src/theme';

export default function SpendsScreen() {
  const { data } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const selectedMonth = monthKeyFromDate();
  const entries = sortSpendEntries(data.monthlySpends[selectedMonth] ?? []);
  const movement = getMoneyMovement(entries);
  const categories = summarizeSpendEntries(entries, (entry) => entry.details?.transaction?.category ?? entry.name);

  return (
    <View style={styles.screen}>
      <Page>
        <Text style={styles.pageKicker}>MONTHLY SPENDS</Text>
        <Text style={styles.heading}>{formatMonthLabel(selectedMonth)}</Text>

        <Kicker>This Month</Kicker>
        <Hero value={formatINR(movement.spent)} label={`Earned ${formatINR(movement.came)} · Spent ${formatINR(movement.spent)}`} />

        <Kicker>By Category</Kicker>
        {categories.length ? (
          <View style={styles.list}>
            {categories.map((category) => (
              <View key={category.name} style={styles.row}>
                <Text style={styles.rowTitle}>{category.name}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min((category.amount / Math.max(categories[0].amount, 1)) * 100, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.amount}>{formatINR(category.amount)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No spends logged yet. Tap + to add one.</Text>
        )}

        <Kicker>Transactions · {entries.length}</Kicker>
        {entries.length ? (
          <View style={styles.list}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.transaction}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{entry.name}</Text>
                  <Text style={styles.meta}>{entry.details?.transaction?.subCategory ?? (entry.recurring ? 'Recurring' : 'One-time')}</Text>
                </View>
                <Text style={styles.amount}>{formatINR(entry.details?.transaction?.amount ?? -entry.amount, { signed: true })}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>Saved spends will appear here.</Text>
        )}
      </Page>
      <Fab onPress={() => setShowForm(true)} />
      <SpendForm visible={showForm} monthKey={selectedMonth} onClose={() => setShowForm(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pageKicker: { ...typography.kicker, color: colors.inkMuted },
  heading: { ...typography.heading, color: colors.ink, marginTop: spacing.xs },
  list: { borderTopColor: colors.rule, borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
  },
  transaction: {
    alignItems: 'center',
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
  },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.subhead, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted, marginTop: 3 },
  amount: { ...typography.metricSm, color: colors.ink },
  barTrack: {
    backgroundColor: colors.paperRecessed,
    borderRadius: 999,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  barFill: { backgroundColor: colors.clay, height: '100%' },
  empty: { ...typography.body, color: colors.inkMuted },
});
