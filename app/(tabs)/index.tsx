import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { Card, Hero, Kicker, Page, PressableOpacity, ProgressRule } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { formatDayHeading, todayIso } from '@/src/lib/date';
import { formatINR } from '@/src/lib/currency';
import { colors, spacing, typography } from '@/src/theme';

export default function HomeScreen() {
  const { data } = useAppData();
  const netWorth = data.ribbons.reduce((sum, ribbon) => sum + Number(ribbon.amount || 0), 0);
  const sortedLoans = [...data.loanTrackerItems].sort((left, right) => right.amountLeftValue - left.amountLeftValue);

  return (
    <Page>
      <Text style={styles.pageKicker}>FINANCE / HEALTH</Text>
      <Text style={styles.heading}>{formatDayHeading(todayIso())}</Text>

      <Kicker>Net Worth</Kicker>
      <Hero value={formatINR(netWorth)} label="Local-only dashboard" />

      <Kicker>Accounts</Kicker>
      <View style={styles.list}>
        {data.ribbons.map((ribbon) => (
          <View key={ribbon.bank} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: ribbon.stripe }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{ribbon.bank}</Text>
              <Text style={styles.rowMeta}>{ribbon.account === 'Cash' ? 'Cash' : `•••• ${ribbon.account}`}</Text>
            </View>
            <Text style={styles.rowAmount}>{formatINR(Number(ribbon.amount || 0))}</Text>
          </View>
        ))}
      </View>

      <Kicker>Loans</Kicker>
      <View style={styles.cards}>
        {sortedLoans.map((loan) => (
          <Link key={loan.id} href={`/loan/${loan.id}`} asChild>
            <PressableOpacity>
              <Card>
                <View style={styles.loanHead}>
                  <View>
                    <Text style={styles.rowTitle}>{loan.title}</Text>
                    <Text style={styles.rowMeta}>{loan.lender}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{loan.amountLeft}</Text>
                </View>
                <ProgressRule progress={loan.progress} />
                <Text style={styles.loanSupport}>
                  {loan.progressLabel} · {loan.support}
                </Text>
              </Card>
            </PressableOpacity>
          </Link>
        ))}
      </View>

      <Kicker>Cards & Owed</Kicker>
      <View style={styles.list}>
        {data.creditCards.map((card) => (
          <View key={card.name} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{card.name}</Text>
              <Text style={styles.rowMeta}>{card.note}</Text>
            </View>
            <Text style={styles.rowAmount}>{formatINR(card.amount)}</Text>
          </View>
        ))}
        {data.peopleToGiveMoney.map((person) => (
          <View key={person.name} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{person.name}</Text>
              <Text style={styles.rowMeta}>Pending personal payment</Text>
            </View>
            <Text style={styles.rowAmount}>{formatINR(person.amount)}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  pageKicker: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  heading: {
    ...typography.heading,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  list: {
    borderTopColor: colors.rule,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  dot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    ...typography.subhead,
    color: colors.ink,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  rowAmount: {
    ...typography.metricSm,
    color: colors.ink,
  },
  cards: {
    gap: spacing.sm,
  },
  loanHead: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  loanSupport: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
});
