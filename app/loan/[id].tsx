import { useLocalSearchParams, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Hero, Kicker, Page, PressableOpacity, ProgressRule } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { colors, spacing, typography } from '@/src/theme';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useAppData();
  const loan = data.loanTrackerItems.find((item) => item.id === id);

  if (!loan) {
    return (
      <Page>
        <Text style={styles.heading}>Loan not found</Text>
      </Page>
    );
  }

  return (
    <Page>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.pageKicker}>{loan.title}</Text>
          <Text style={styles.heading}>{loan.lender}</Text>
        </View>
        <PressableOpacity onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>Close</Text>
        </PressableOpacity>
      </View>

      <Hero value={loan.amountLeft} label={`remaining · ${loan.progressLabel}`} />
      <ProgressRule progress={loan.progress} />

      <Kicker>Details</Kicker>
      <Card>
        {loan.detailRows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.meta}>{row.label}</Text>
            <Text style={styles.amount}>{row.value}</Text>
          </View>
        ))}
      </Card>

      <Kicker>Schedule</Kicker>
      <Card>
        {loan.schedule.map((item, index) => (
          <View key={item} style={styles.row}>
            <Text style={styles.meta}>Month {index + 1}</Text>
            <Text style={styles.amount}>{item.replace(/^Month \d+ - /, '')}</Text>
          </View>
        ))}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  topbar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pageKicker: { ...typography.kicker, color: colors.inkMuted },
  heading: { ...typography.heading, color: colors.ink, marginTop: spacing.xs },
  close: { minHeight: 44, justifyContent: 'center' },
  closeText: { ...typography.subhead, color: colors.clay },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  meta: { ...typography.body, color: colors.inkMuted },
  amount: { ...typography.metricSm, color: colors.ink },
});
