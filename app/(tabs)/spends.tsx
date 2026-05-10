import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpendForm } from '@/src/components/features/spends/SpendForm';
import {
  type Metric as ChartMetric,
  type Range as ChartRange,
  TransactionChart,
} from '@/src/components/features/spends/TransactionChart';
import { Fab, Kicker, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { SpendEntry } from '@/src/data/types';
import { formatINR } from '@/src/lib/currency';
import { formatMonthLabel, monthKeyFromDate } from '@/src/lib/date';
import {
  entrySignedAmount,
  getFriendBalances,
  isEarning,
  isFriendTagged,
  isSpend,
  removeEntryFromMonthlySpends,
  sortSpendEntries,
  summarizeSpendEntries,
} from '@/src/lib/monthly-spends';
import { colors, radius, spacing, typography } from '@/src/theme';

type View2 = 'spend' | 'earning';

export default function SpendsScreen() {
  const { data, setData } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SpendEntry | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('net');
  const [chartRange, setChartRange] = useState<ChartRange>('month');
  const [view, setView] = useState<View2>('spend');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [settling, setSettling] = useState<{ name: string; balance: number } | null>(null);
  const [settleAmount, setSettleAmount] = useState('');

  const { width } = useWindowDimensions();
  const chartWidth = width - spacing.lg * 2;

  const selectedMonth = monthKeyFromDate();
  const allEntries = data.monthlySpends[selectedMonth] ?? [];
  const sortedEntries = useMemo(() => sortSpendEntries(allEntries), [allEntries]);

  const earnings = useMemo(() => sortedEntries.filter(isEarning), [sortedEntries]);
  const spends = useMemo(() => sortedEntries.filter(isSpend), [sortedEntries]);

  const earned = earnings.reduce((s, e) => s + entrySignedAmount(e), 0);
  const spent = spends.reduce((s, e) => s + Math.abs(entrySignedAmount(e)), 0);
  const balance = earned - spent;
  const earnedRatio = earned + spent > 0 ? earned / (earned + spent) : 0;

  const viewEntries = view === 'earning' ? earnings : spends;

  const categories = useMemo(
    () =>
      summarizeSpendEntries(viewEntries, (entry) => entry.details?.transaction?.category ?? entry.name),
    [viewEntries],
  );

  // Reset selection when toggling between Spends/Earnings.
  useEffect(() => {
    setSelectedCats(new Set());
  }, [view]);

  const transactions = useMemo(() => {
    let txns = viewEntries;
    if (selectedCats.size > 0) {
      txns = txns.filter((e) => {
        const cat = e.details?.transaction?.category ?? e.name;
        return selectedCats.has(cat);
      });
    }
    if (selectedFriend) {
      txns = txns.filter(
        (e) =>
          (e.details?.transaction?.friend ?? '').trim().toLowerCase() ===
          selectedFriend.toLowerCase(),
      );
    }
    return [...txns].reverse();
  }, [viewEntries, selectedCats, selectedFriend]);

  const selectedSum = useMemo(() => {
    if (selectedCats.size === 0) return 0;
    return viewEntries
      .filter((e) => selectedCats.has(e.details?.transaction?.category ?? e.name))
      .reduce((s, e) => s + Math.abs(entrySignedAmount(e)), 0);
  }, [viewEntries, selectedCats]);

  const accent = view === 'earning' ? colors.success : colors.danger;

  function toggleCategory(name: string) {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearSelection() {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedCats(new Set());
  }

  function changeView(next: View2) {
    if (next === view) return;
    Haptics.selectionAsync().catch(() => undefined);
    setView(next);
  }

  const friendBalances = useMemo(() => getFriendBalances(data.monthlySpends), [data.monthlySpends]);

  const friendEntries = useMemo(() => {
    const all: SpendEntry[] = [];
    for (const entries of Object.values(data.monthlySpends)) {
      for (const entry of entries) {
        if (isFriendTagged(entry)) all.push(entry);
      }
    }
    return all.sort((a, b) => {
      const aDate = a.details?.transaction?.date ?? '';
      const bDate = b.details?.transaction?.date ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [data.monthlySpends]);

  const lentEntries = useMemo(() => friendEntries.filter(isSpend), [friendEntries]);
  const tookEntries = useMemo(() => friendEntries.filter(isEarning), [friendEntries]);
  const totalLent = lentEntries.reduce((s, e) => s + Math.abs(entrySignedAmount(e)), 0);
  const totalTook = tookEntries.reduce((s, e) => s + entrySignedAmount(e), 0);
  const settlementNet = totalTook - totalLent;

  function toggleFriend(name: string) {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedFriend((prev) => (prev === name ? null : name));
  }

  function openSettle(name: string, balance: number) {
    if (balance === 0) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSettling({ name, balance });
    setSettleAmount(String(Math.abs(balance)));
  }

  function closeSettle() {
    setSettling(null);
    setSettleAmount('');
  }

  function applyFullSettle() {
    if (!settling) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSettleAmount(String(Math.abs(settling.balance)));
  }

  function confirmSettle() {
    if (!settling) return;
    const amount = Number(settleAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const outstanding = Math.abs(settling.balance);
    const cappedAmount = Math.min(amount, outstanding);
    const isPartial = cappedAmount < outstanding;
    const isReceiving = settling.balance > 0;
    const signed = isReceiving ? cappedAmount : -cappedAmount;
    const targetMonthKey = monthKeyFromDate();
    const now = new Date();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    setData((prev) => ({
      ...prev,
      monthlySpends: {
        ...prev.monthlySpends,
        [targetMonthKey]: [
          ...(prev.monthlySpends[targetMonthKey] ?? []),
          {
            id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: isPartial ? `Partial settle with ${settling.name}` : `Settled with ${settling.name}`,
            amount: cappedAmount,
            recurring: false,
            details: {
              transaction: {
                date: now.toISOString(),
                time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
                category: 'Settlement',
                subCategory: isReceiving ? 'Repaid by friend' : 'Repaid to friend',
                note: isPartial ? 'Partial settlement' : 'Auto-settled',
                amount: signed,
                friend: settling.name,
              },
            },
          },
        ],
      },
    }));

    closeSettle();
  }

  function openNewForm() {
    setEditingEntry(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEntry(null);
  }

  function deleteEntry(entry: SpendEntry) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setData((prev) => ({
      ...prev,
      monthlySpends: removeEntryFromMonthlySpends(prev.monthlySpends, entry.id),
    }));
  }

  function onTransactionLongPress(entry: SpendEntry) {
    Haptics.selectionAsync().catch(() => undefined);
    const signed = entrySignedAmount(entry);
    Alert.alert(entry.name, formatINR(signed, { signed: true }), [
      {
        text: 'Edit',
        onPress: () => {
          setEditingEntry(entry);
          setShowForm(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete this transaction?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry) },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageKicker}>MONTHLY FINANCE</Text>
        <Text style={styles.heading}>{formatMonthLabel(selectedMonth)}</Text>

        <Kicker>Balance</Kicker>
        <Text
          style={[styles.balance, { color: balance >= 0 ? colors.success : colors.danger }]}
          adjustsFontSizeToFit
          numberOfLines={1}>
          {formatINR(balance, { signed: true })}
        </Text>
        <View style={styles.tape}>
          <View style={[styles.tapeFill, { flex: earnedRatio, backgroundColor: colors.success }]} />
          <View style={[styles.tapeFill, { flex: 1 - earnedRatio, backgroundColor: colors.danger }]} />
        </View>
        <View style={styles.balanceLine}>
          <View style={styles.balancePill}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.balanceLabel}>Earned</Text>
            <Text style={[styles.balanceValue, { color: colors.success }]}>{formatINR(earned)}</Text>
          </View>
          <View style={styles.balancePill}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.balanceLabel}>Spent</Text>
            <Text style={[styles.balanceValue, { color: colors.danger }]}>{formatINR(spent)}</Text>
          </View>
        </View>

        <Kicker>Trends</Kicker>
        <TransactionChart
          metric={chartMetric}
          onMetricChange={setChartMetric}
          range={chartRange}
          onRangeChange={setChartRange}
          monthlySpends={data.monthlySpends}
          width={chartWidth}
        />

        {friendBalances.length > 0 ? (
          <>
            <Kicker>Friends · {friendBalances.length}</Kicker>
            <View>
              {friendBalances.map((friend) => {
                const isOwed = friend.balance > 0;
                const isYouOwe = friend.balance < 0;
                const settled = friend.balance === 0;
                const tone = isOwed ? colors.success : isYouOwe ? colors.danger : colors.inkMuted;
                const label = isOwed
                  ? 'OWES YOU'
                  : isYouOwe
                  ? 'YOU OWE'
                  : 'SETTLED';
                const amount = settled ? '—' : formatINR(Math.abs(friend.balance));
                const isSelected = selectedFriend === friend.name;
                return (
                  <Pressable
                    key={friend.name}
                    onPress={() => toggleFriend(friend.name)}
                    style={({ pressed }) => [
                      styles.friendRow,
                      isSelected && {
                        backgroundColor: colors.surfaceTint,
                        borderColor: tone,
                      },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <View style={styles.friendLeft}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {friend.name}
                      </Text>
                      <Text style={styles.friendCount}>
                        {friend.count} {friend.count === 1 ? 'txn' : 'txns'}
                      </Text>
                    </View>
                    <View style={styles.friendRight}>
                      <Text style={[styles.friendLabel, { color: tone }]}>{label}</Text>
                      <Text style={[styles.friendAmount, { color: tone }]}>{amount}</Text>
                    </View>
                    {!settled ? (
                      <Pressable
                        onPress={() => openSettle(friend.name, friend.balance)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.settleBtn,
                          { borderColor: tone },
                          pressed && { backgroundColor: `${tone}22` },
                        ]}>
                        <Ionicons name="checkmark-done" size={16} color={tone} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
              {selectedFriend ? (
                <PressableOpacity
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setSelectedFriend(null);
                  }}
                  style={styles.clearFriendBtn}
                  hitSlop={6}>
                  <Ionicons name="close" size={12} color={colors.inkMuted} />
                  <Text style={styles.clearFriendText}>Clear filter ({selectedFriend})</Text>
                </PressableOpacity>
              ) : null}
            </View>
          </>
        ) : null}

        {friendEntries.length > 0 ? (
          <>
            <Kicker>Settlements</Kicker>
            <View style={styles.settlementSummary}>
              <View style={styles.settlementSummaryCell}>
                <Text style={styles.settlementSummaryLabel}>GAVE</Text>
                <Text style={[styles.settlementSummaryValue, { color: colors.danger }]}>
                  {formatINR(totalLent)}
                </Text>
              </View>
              <View style={styles.settlementSummaryCell}>
                <Text style={styles.settlementSummaryLabel}>TOOK</Text>
                <Text style={[styles.settlementSummaryValue, { color: colors.success }]}>
                  {formatINR(totalTook)}
                </Text>
              </View>
              <View style={styles.settlementSummaryCell}>
                <Text style={styles.settlementSummaryLabel}>NET</Text>
                <Text
                  style={[
                    styles.settlementSummaryValue,
                    { color: settlementNet >= 0 ? colors.success : colors.danger },
                  ]}>
                  {formatINR(settlementNet, { signed: true })}
                </Text>
              </View>
            </View>

            {lentEntries.length > 0 ? (
              <View style={styles.settlementBlock}>
                <View style={styles.settlementHead}>
                  <Ionicons name="arrow-up-outline" size={14} color={colors.danger} />
                  <Text style={[styles.settlementBlockLabel, { color: colors.danger }]}>I GAVE</Text>
                  <Text style={styles.settlementBlockCount}>{lentEntries.length}</Text>
                </View>
                {lentEntries.map((entry) => (
                  <SettlementRow
                    key={entry.id}
                    entry={entry}
                    direction="gave"
                    onLongPress={() => onTransactionLongPress(entry)}
                  />
                ))}
              </View>
            ) : null}

            {tookEntries.length > 0 ? (
              <View style={styles.settlementBlock}>
                <View style={styles.settlementHead}>
                  <Ionicons name="arrow-down-outline" size={14} color={colors.success} />
                  <Text style={[styles.settlementBlockLabel, { color: colors.success }]}>I TOOK</Text>
                  <Text style={styles.settlementBlockCount}>{tookEntries.length}</Text>
                </View>
                {tookEntries.map((entry) => (
                  <SettlementRow
                    key={entry.id}
                    entry={entry}
                    direction="took"
                    onLongPress={() => onTransactionLongPress(entry)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.viewToggleWrap}>
          <ViewPill active={view === 'spend'} label="Spends" color={colors.danger} onPress={() => changeView('spend')} />
          <ViewPill active={view === 'earning'} label="Earnings" color={colors.success} onPress={() => changeView('earning')} />
        </View>

        {selectedCats.size > 0 ? (
          <View style={styles.selectedBar}>
            <View style={styles.selectedBarLeft}>
              <Text style={styles.selectedBarLabel}>SELECTED · {selectedCats.size}</Text>
              <Text style={[styles.selectedBarValue, { color: accent }]}>{formatINR(selectedSum)}</Text>
            </View>
            <PressableOpacity onPress={clearSelection} style={styles.clearBtn} hitSlop={6}>
              <Text style={styles.clearText}>Clear</Text>
            </PressableOpacity>
          </View>
        ) : null}

        <Kicker>By Category</Kicker>
        {categories.length > 0 ? (
          <View>
            {categories.map((category, index) => {
              const max = Math.max(categories[0].amount, 1);
              const ratio = Math.min(category.amount / max, 1);
              const isSelected = selectedCats.has(category.name);
              return (
                <PressableOpacity
                  key={`${category.name}-${index}`}
                  onPress={() => toggleCategory(category.name)}
                  style={[
                    styles.catRow,
                    isSelected && { backgroundColor: colors.surfaceTint, borderColor: accent },
                  ]}>
                  <View style={styles.catCheckbox}>
                    {isSelected ? (
                      <View style={[styles.catCheckboxFill, { backgroundColor: accent }]}>
                        <Ionicons name="checkmark" size={12} color={colors.paperRaised} />
                      </View>
                    ) : (
                      <View style={styles.catCheckboxEmpty} />
                    )}
                  </View>
                  <Text style={styles.catTitle} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${ratio * 100}%`, backgroundColor: accent },
                      ]}
                    />
                  </View>
                  <Text style={styles.catAmount}>{formatINR(category.amount)}</Text>
                </PressableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>
            No {view === 'earning' ? 'earnings' : 'spends'} yet this month.
          </Text>
        )}

        <Kicker>
          {view === 'earning' ? 'Earnings' : 'Spends'} · {transactions.length}
          {selectedCats.size > 0 ? ` · filtered` : ''}
        </Kicker>
        {transactions.length > 0 ? (
          <View>
            {transactions.map((entry) => {
              const signed = entrySignedAmount(entry);
              const isEarn = signed > 0;
              const txnColor = isEarn ? colors.success : colors.danger;
              const txn = entry.details?.transaction;
              const dateStr = txn?.date
                ? new Date(txn.date).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })
                : null;
              const meta = [
                dateStr,
                txn?.category,
                txn?.subCategory && txn.subCategory !== entry.name ? txn.subCategory : null,
                txn?.friend ? `${isEarn ? 'from' : 'to'} ${txn.friend}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={entry.id}
                  onLongPress={() => onTransactionLongPress(entry)}
                  delayLongPress={280}
                  style={({ pressed }) => [styles.txnRow, pressed && { opacity: 0.6 }]}>
                  <View style={styles.txnLeft}>
                    <View style={[styles.txnDot, { backgroundColor: txnColor }]} />
                    <View style={styles.txnCopy}>
                      <Text style={styles.txnTitle} numberOfLines={1}>
                        {entry.name}
                      </Text>
                      <Text style={styles.txnMeta} numberOfLines={1}>
                        {meta || '—'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txnAmount, { color: txnColor }]}>
                    {formatINR(signed, { signed: true })}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.longPressHint}>Long-press a transaction to edit or delete</Text>
          </View>
        ) : (
          <Text style={styles.empty}>
            {selectedCats.size > 0
              ? 'No matches in selected categories.'
              : `Tap + to log a${view === 'earning' ? 'n earning' : ' spend'}.`}
          </Text>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <Fab onPress={openNewForm} />
      <SpendForm
        visible={showForm}
        monthKey={selectedMonth}
        editingEntry={editingEntry}
        onClose={closeForm}
      />

      <Modal
        visible={settling !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSettle}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.settleBackdropWrap}>
          <Pressable style={styles.settleBackdrop} onPress={closeSettle} />
          <Pressable style={styles.settleCard} onPress={(e) => e.stopPropagation()}>
            {settling ? (
              (() => {
                const isReceiving = settling.balance > 0;
                const tone = isReceiving ? colors.success : colors.danger;
                const outstanding = Math.abs(settling.balance);
                const parsed = Number(settleAmount);
                const valid = Number.isFinite(parsed) && parsed > 0;
                const capped = valid ? Math.min(parsed, outstanding) : 0;
                const isPartial = valid && capped < outstanding;
                const isOver = valid && parsed > outstanding;
                return (
                  <>
                    <Text style={styles.settleEyebrow}>SETTLE WITH {settling.name.toUpperCase()}</Text>
                    <Text style={styles.settleDirection}>
                      {isReceiving
                        ? `${settling.name} pays you back`
                        : `You pay ${settling.name} back`}
                    </Text>

                    <View style={styles.settleAmountRow}>
                      <Text style={[styles.settleCurrency, { color: tone }]}>₹</Text>
                      <TextInput
                        autoFocus
                        value={settleAmount}
                        onChangeText={setSettleAmount}
                        keyboardType="decimal-pad"
                        style={[styles.settleAmountInput, { color: tone }]}
                        selectionColor={tone}
                        maxLength={9}
                      />
                    </View>

                    <Text style={styles.settleHint}>
                      Outstanding {formatINR(outstanding)}
                      {valid
                        ? isOver
                          ? ' · only outstanding will be settled'
                          : isPartial
                          ? ` · partial · remaining ${formatINR(outstanding - capped)}`
                          : ' · full settlement'
                        : ''}
                    </Text>

                    <View style={styles.settleQuickRow}>
                      <PressableOpacity onPress={applyFullSettle} style={styles.settleQuickChip}>
                        <Text style={styles.settleQuickText}>Full · {formatINR(outstanding)}</Text>
                      </PressableOpacity>
                      <PressableOpacity
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => undefined);
                          setSettleAmount(String(Math.round(outstanding / 2)));
                        }}
                        style={styles.settleQuickChip}>
                        <Text style={styles.settleQuickText}>Half · {formatINR(Math.round(outstanding / 2))}</Text>
                      </PressableOpacity>
                    </View>

                    <View style={styles.settleActions}>
                      <PressableOpacity onPress={closeSettle} style={styles.settleCancel}>
                        <Text style={styles.settleCancelText}>Cancel</Text>
                      </PressableOpacity>
                      <PressableOpacity
                        onPress={confirmSettle}
                        disabled={!valid}
                        style={[
                          styles.settleConfirm,
                          { backgroundColor: tone },
                          !valid && { opacity: 0.4 },
                        ]}>
                        <Text style={styles.settleConfirmText}>
                          Settle {valid ? formatINR(capped) : ''}
                        </Text>
                      </PressableOpacity>
                    </View>
                  </>
                );
              })()
            ) : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SettlementRow({
  entry,
  direction,
  onLongPress,
}: {
  entry: SpendEntry;
  direction: 'gave' | 'took';
  onLongPress: () => void;
}) {
  const txn = entry.details?.transaction;
  const friend = txn?.friend ?? '—';
  const dateStr = txn?.date
    ? new Date(txn.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    : '';
  const amount = Math.abs(entrySignedAmount(entry));
  const color = direction === 'gave' ? colors.danger : colors.success;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={({ pressed }) => [styles.settlementRow, pressed && { opacity: 0.6 }]}>
      <View style={styles.settlementLeft}>
        <Text style={styles.settlementFriend} numberOfLines={1}>
          {friend}
        </Text>
        <Text style={styles.settlementMeta} numberOfLines={1}>
          {dateStr}
          {txn?.note && txn.note !== 'None' ? ` · ${txn.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.settlementAmount, { color }]}>{formatINR(amount)}</Text>
    </Pressable>
  );
}

function ViewPill({
  active,
  label,
  color,
  onPress,
}: {
  active: boolean;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <PressableOpacity
      onPress={onPress}
      style={[styles.viewPill, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.viewText, active && styles.viewTextActive]}>{label}</Text>
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pageKicker: { ...typography.kicker, color: colors.inkMuted },
  heading: { ...typography.heading, color: colors.ink, marginTop: spacing.xs },
  balance: { ...typography.hero, fontSize: 52, lineHeight: 56 },
  tape: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
    backgroundColor: colors.paperRecessed,
  },
  tapeFill: { height: '100%' },
  balanceLine: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  balanceLabel: { ...typography.caption, color: colors.inkMuted },
  balanceValue: { ...typography.metricSm, fontSize: 13, fontWeight: '600' },

  viewToggleWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  viewPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    alignItems: 'center',
    backgroundColor: colors.paperRecessed,
  },
  viewText: { ...typography.subhead, fontSize: 14, color: colors.inkSoft },
  viewTextActive: { color: colors.paperRaised },

  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paperRaised,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  selectedBarLeft: { gap: 2 },
  selectedBarLabel: { ...typography.kicker, fontSize: 10, color: colors.inkMuted },
  selectedBarValue: { ...typography.metric, fontSize: 18 },
  clearBtn: { minHeight: 32, paddingHorizontal: 8, justifyContent: 'center' },
  clearText: { ...typography.subhead, fontSize: 13, color: colors.inkMuted },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  catCheckbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCheckboxEmpty: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderColor: colors.rule,
    borderWidth: 1.2,
  },
  catCheckboxFill: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: { ...typography.subhead, color: colors.ink, fontSize: 14, minWidth: 80 },
  catAmount: { ...typography.metricSm, color: colors.ink, fontSize: 13 },

  barTrack: {
    backgroundColor: colors.paperRecessed,
    borderRadius: 999,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },

  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  txnLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  txnDot: { width: 6, height: 6, borderRadius: 3 },
  txnCopy: { flex: 1 },
  txnTitle: { ...typography.subhead, color: colors.ink, fontSize: 15 },
  txnMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  txnAmount: { ...typography.metricSm },

  empty: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xs },
  bottomPad: { height: 96 },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    backgroundColor: colors.paperRaised,
    marginBottom: 4,
    gap: spacing.xs,
  },
  friendLeft: { flex: 1, gap: 2 },
  friendName: { ...typography.subhead, color: colors.ink, fontSize: 15 },
  friendCount: { ...typography.caption, color: colors.inkMuted, fontSize: 11 },
  friendRight: { alignItems: 'flex-end', gap: 2 },
  friendLabel: { ...typography.kicker, fontSize: 9 },
  friendAmount: { ...typography.metric, fontSize: 16 },
  settleBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  clearFriendText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkMuted,
  },
  longPressHint: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 11,
    paddingTop: spacing.sm,
    textAlign: 'center',
  },

  settlementSummary: {
    flexDirection: 'row',
    backgroundColor: colors.paperRaised,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  settlementSummaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  settlementSummaryLabel: {
    ...typography.kicker,
    color: colors.inkMuted,
    fontSize: 9,
  },
  settlementSummaryValue: {
    ...typography.metric,
    fontSize: 16,
  },
  settlementBlock: {
    marginBottom: spacing.sm,
  },
  settlementHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  settlementBlockLabel: {
    ...typography.kicker,
    fontSize: 10,
    letterSpacing: 1,
  },
  settlementBlockCount: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkMuted,
    marginLeft: 'auto',
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    minHeight: 48,
  },
  settlementLeft: { flex: 1, gap: 2 },
  settlementFriend: { ...typography.subhead, color: colors.ink, fontSize: 14 },
  settlementMeta: { ...typography.caption, color: colors.inkMuted, fontSize: 11 },
  settlementAmount: { ...typography.metric, fontSize: 16 },

  settleBackdropWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,29,31,0.5)',
  },
  settleCard: {
    width: '88%',
    maxWidth: 380,
    backgroundColor: colors.paperRaised,
    borderRadius: 22,
    padding: 22,
    gap: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  settleEyebrow: {
    ...typography.kicker,
    fontSize: 10,
    color: colors.inkMuted,
  },
  settleDirection: {
    ...typography.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  settleAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 12,
  },
  settleCurrency: {
    ...typography.hero,
    fontSize: 28,
    lineHeight: 32,
  },
  settleAmountInput: {
    ...typography.hero,
    fontSize: 44,
    lineHeight: 48,
    minWidth: 80,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  settleHint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  settleQuickRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  settleQuickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.paperRecessed,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  settleQuickText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  settleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  settleCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.paperRecessed,
  },
  settleCancelText: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.inkSoft,
  },
  settleConfirm: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  settleConfirmText: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.paperRaised,
  },
});
