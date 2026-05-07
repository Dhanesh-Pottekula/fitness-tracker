import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatINR } from '@/src/lib/currency';

import { BottomSheet, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import type { SpendEntry } from '@/src/data/types';
import { lastNDaysIso, todayIso } from '@/src/lib/date';
import {
  EARNING_CATEGORIES,
  SPEND_CATEGORIES,
  type TxnType,
  createSpendId,
  knownFriendNames,
  normalizeSpendName,
  removeEntryFromMonthlySpends,
} from '@/src/lib/monthly-spends';
import { colors, radius, spacing, typography } from '@/src/theme';

const DATE_RANGE = 60;

const SPEND_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Food: 'restaurant-outline',
  Rent: 'home-outline',
  Gym: 'barbell-outline',
  Transport: 'car-outline',
  Shopping: 'bag-outline',
  Bills: 'receipt-outline',
  Other: 'ellipsis-horizontal',
};

const EARN_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Salary: 'briefcase-outline',
  Freelance: 'laptop-outline',
  Investments: 'trending-up-outline',
  Gifts: 'gift-outline',
  Other: 'ellipsis-horizontal',
};

export function SpendForm({
  visible,
  monthKey,
  editingEntry,
  onClose,
}: {
  visible: boolean;
  monthKey: string;
  editingEntry?: SpendEntry | null;
  onClose: () => void;
}) {
  const { data, setData } = useAppData();
  const isEditing = !!editingEntry;
  const [type, setType] = useState<TxnType>('spend');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [spendCategory, setSpendCategory] = useState(SPEND_CATEGORIES[0]);
  const [earnCategory, setEarnCategory] = useState(EARNING_CATEGORIES[0]);
  const [subCategory, setSubCategory] = useState('');
  const [note, setNote] = useState('');
  const [friend, setFriend] = useState('');
  const [date, setDate] = useState(todayIso());
  const dateScrollRef = useRef<ScrollView>(null);
  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    if (editingEntry) {
      const txn = editingEntry.details?.transaction;
      const signed = txn?.amount ?? -editingEntry.amount;
      const t: TxnType = signed >= 0 ? 'earning' : 'spend';
      setType(t);
      setName(editingEntry.name);
      setAmount(String(Math.abs(signed)));
      const cat = txn?.category ?? '';
      if (t === 'earning') {
        setEarnCategory(EARNING_CATEGORIES.includes(cat) ? cat : EARNING_CATEGORIES[0]);
        setSpendCategory(SPEND_CATEGORIES[0]);
      } else {
        setSpendCategory(SPEND_CATEGORIES.includes(cat) ? cat : SPEND_CATEGORIES[0]);
        setEarnCategory(EARNING_CATEGORIES[0]);
      }
      setSubCategory(txn?.subCategory ?? '');
      setNote(txn?.note && txn.note !== 'None' ? txn.note : '');
      setFriend(txn?.friend ?? '');
      const txnDateIso = txn?.date ? new Date(txn.date).toISOString().slice(0, 10) : todayIso();
      setDate(txnDateIso);
    } else {
      setType('spend');
      setName('');
      setAmount('');
      setSpendCategory(SPEND_CATEGORIES[0]);
      setEarnCategory(EARNING_CATEGORIES[0]);
      setSubCategory('');
      setNote('');
      setFriend('');
      setDate(todayIso());
    }
    requestAnimationFrame(() => {
      dateScrollRef.current?.scrollToEnd({ animated: false });
    });
    if (!editingEntry) {
      const t = setTimeout(() => amountInputRef.current?.focus(), 380);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, editingEntry]);

  // Oldest on the left, today on the right.
  const dateOptions = useMemo(() => lastNDaysIso(DATE_RANGE), []);

  const categories = type === 'earning' ? EARNING_CATEGORIES : SPEND_CATEGORIES;
  const category = type === 'earning' ? earnCategory : spendCategory;
  const setCategory = (value: string) =>
    type === 'earning' ? setEarnCategory(value) : setSpendCategory(value);

  function save() {
    const parsed = Number(amount);
    const normalizedName = normalizeSpendName(name || category);
    if (!normalizedName || !Number.isFinite(parsed) || parsed <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

    const signed = type === 'earning' ? parsed : -parsed;
    const [y, m, d] = date.split('-').map(Number);
    const now = new Date();
    const txnDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes());
    const targetMonthKey = `${y}-${String(m).padStart(2, '0')}`;
    const friendValue = friend.trim();

    const newEntry: SpendEntry = {
      id: editingEntry?.id ?? createSpendId(),
      name: normalizedName,
      amount: parsed,
      recurring: editingEntry?.recurring ?? false,
      details: {
        transaction: {
          date: txnDate.toISOString(),
          time: `${String(txnDate.getHours()).padStart(2, '0')}:${String(txnDate.getMinutes()).padStart(2, '0')}`,
          category,
          subCategory: subCategory || normalizedName,
          note: note || 'None',
          amount: signed,
          friend: friendValue || undefined,
        },
      },
    };

    setData((previous) => {
      const cleaned = isEditing
        ? removeEntryFromMonthlySpends(previous.monthlySpends, newEntry.id)
        : { ...previous.monthlySpends };
      return {
        ...previous,
        monthlySpends: {
          ...cleaned,
          [targetMonthKey]: [...(cleaned[targetMonthKey] ?? []), newEntry],
        },
      };
    });

    onClose();
  }

  const friendSuggestions = useMemo(() => knownFriendNames(data.monthlySpends), [data.monthlySpends]);

  const accent = type === 'earning' ? colors.success : colors.danger;

  const sheetTitle = isEditing
    ? type === 'earning'
      ? 'Edit Earning'
      : 'Edit Spend'
    : type === 'earning'
    ? 'Log Earning'
    : 'Log Spend';

  return (
    <BottomSheet visible={visible} title={sheetTitle} onClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {!isEditing ? (
          <View style={styles.typeToggle}>
            <TypePill
              active={type === 'spend'}
              label="Spend"
              color={colors.danger}
              onPress={() => setType('spend')}
            />
            <TypePill
              active={type === 'earning'}
              label="Earning"
              color={colors.success}
              onPress={() => setType('earning')}
            />
          </View>
        ) : (
          <View style={[styles.typeToggle, { gap: spacing.xs }]}>
            <View
              style={[
                styles.typePill,
                { backgroundColor: accent, borderColor: accent, flex: 1 },
              ]}>
              <Text style={[styles.typeText, styles.typeTextActive]}>
                {type === 'earning' ? 'Earning' : 'Spend'}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.amountHero}>
            <Text style={[styles.amountCurrency, { color: accent }]}>₹</Text>
            <TextInput
              ref={amountInputRef}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.rule}
              style={[styles.amountInput, { color: accent }]}
              selectionColor={accent}
              clearButtonMode="while-editing"
              maxLength={9}
            />
            {amount ? (
              <PressableOpacity onPress={() => setAmount('')} style={styles.amountClear} hitSlop={6}>
                <Ionicons name="close-circle" size={22} color={colors.inkMuted} />
              </PressableOpacity>
            ) : null}
          </View>

          <View style={styles.amountQuick}>
            {[100, 500, 1000, 2000].map((value) => (
              <PressableOpacity
                key={value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setAmount(String(value));
                }}
                style={styles.amountChip}>
                <Text style={styles.amountChipText}>{formatINR(value, { compact: true })}</Text>
              </PressableOpacity>
            ))}
          </View>

          <Text style={styles.label}>When</Text>
          <DatePicker
            scrollRef={dateScrollRef}
            options={dateOptions}
            selected={date}
            accent={accent}
            onSelect={setDate}
            onLayoutDone={() => dateScrollRef.current?.scrollToEnd({ animated: false })}
          />

          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryScroll}>
            {categories.map((item) => {
              const isActive = item === category;
              const iconMap = type === 'earning' ? EARN_ICONS : SPEND_ICONS;
              const iconName = iconMap[item] ?? 'pricetag-outline';
              return (
                <PressableOpacity
                  key={item}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setCategory(item);
                  }}
                  style={[
                    styles.categoryPill,
                    isActive && { backgroundColor: accent, borderColor: accent },
                  ]}>
                  <Ionicons
                    name={iconName}
                    size={16}
                    color={isActive ? colors.paperRaised : colors.inkSoft}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      isActive && styles.categoryPillTextActive,
                    ]}>
                    {item}
                  </Text>
                </PressableOpacity>
              );
            })}
          </ScrollView>

          <Field label="Name" value={name} onChangeText={setName} placeholder={category} />
          <Field
            label="Sub-cat"
            value={subCategory}
            onChangeText={setSubCategory}
            placeholder="PG, UPI, monthly..."
          />

          <Text style={styles.label}>Friend (optional)</Text>
          {friendSuggestions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.friendChips}>
              {friendSuggestions.map((suggestion) => {
                const active = friend.trim().toLowerCase() === suggestion.toLowerCase();
                return (
                  <PressableOpacity
                    key={suggestion}
                    onPress={() => setFriend(active ? '' : suggestion)}
                    style={[
                      styles.friendChip,
                      active && { backgroundColor: accent, borderColor: accent },
                    ]}>
                    <Text
                      style={[
                        styles.friendChipText,
                        active && styles.friendChipTextActive,
                      ]}>
                      {suggestion}
                    </Text>
                  </PressableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <TextInput
            value={friend}
            onChangeText={setFriend}
            placeholder="Name (e.g. Raj)"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          {friend.trim() ? (
            <Text style={styles.friendHint}>
              {type === 'spend' ? 'Lent to' : 'Received from'} {friend.trim()} — tracked in Friends
            </Text>
          ) : null}

          <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" />

          <PressableOpacity onPress={save} style={[styles.save, { backgroundColor: accent }]}>
            <Text style={styles.saveText}>
              {isEditing ? 'Update' : 'Save'} {type === 'earning' ? 'Earning' : 'Spend'}
            </Text>
          </PressableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function DatePicker({
  scrollRef,
  options,
  selected,
  accent,
  onSelect,
  onLayoutDone,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
  options: string[];
  selected: string;
  accent: string;
  onSelect: (iso: string) => void;
  onLayoutDone: () => void;
}) {
  const today = todayIso();
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={dateStyles.scroll}
      onContentSizeChange={onLayoutDone}>
      {options.map((iso) => {
        const [, , d] = iso.split('-').map(Number);
        const isToday = iso === today;
        const active = iso === selected;
        const monthAbbrev = new Date(iso).toLocaleDateString('en-IN', { month: 'short' });
        const weekday = new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' });
        return (
          <PressableOpacity
            key={iso}
            onPress={() => onSelect(iso)}
            style={[
              dateStyles.chip,
              active && { backgroundColor: accent, borderColor: accent },
            ]}>
            <Text style={[dateStyles.chipDay, active && dateStyles.chipDayActive]}>
              {isToday ? 'TODAY' : weekday.slice(0, 3).toUpperCase()}
            </Text>
            <Text style={[dateStyles.chipDate, active && dateStyles.chipDateActive]}>{d}</Text>
            <Text style={[dateStyles.chipMonth, active && dateStyles.chipMonthActive]}>
              {monthAbbrev}
            </Text>
          </PressableOpacity>
        );
      })}
    </ScrollView>
  );
}

function TypePill({
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
      style={[styles.typePill, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.typeText, active && styles.typeTextActive]}>{label}</Text>
    </PressableOpacity>
  );
}

function Field({
  label,
  numeric,
  accent,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  numeric?: boolean;
  accent?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[
          styles.input,
          numeric && styles.numericInput,
          accent && numeric ? { color: accent } : null,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  amountHero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  amountCurrency: {
    ...typography.hero,
    fontSize: 36,
    lineHeight: 40,
  },
  amountInput: {
    ...typography.hero,
    fontSize: 56,
    lineHeight: 60,
    flex: 0,
    minWidth: 60,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  amountClear: {
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },
  amountQuick: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  amountChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.paperRecessed,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
  },
  amountChipText: {
    ...typography.subhead,
    fontSize: 13,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  typeToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  typePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    alignItems: 'center',
    backgroundColor: colors.paperRecessed,
  },
  typeText: { ...typography.subhead, fontSize: 14, color: colors.inkSoft },
  typeTextActive: { color: colors.paperRaised },
  field: { marginBottom: spacing.md },
  label: { ...typography.kicker, color: colors.inkMuted, marginBottom: spacing.xs },
  input: {
    ...typography.body,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  numericInput: { ...typography.metric, fontSize: 22 },
  categoryScroll: {
    gap: 8,
    paddingBottom: spacing.md,
    paddingRight: spacing.sm,
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.paperRecessed,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
  categoryPillText: {
    ...typography.subhead,
    fontSize: 14,
    color: colors.inkSoft,
  },
  categoryPillTextActive: {
    color: colors.paperRaised,
  },
  save: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: 999,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  saveText: { ...typography.subhead, color: colors.paperRaised },
  friendChips: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
    paddingRight: spacing.sm,
  },
  friendChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.paperRecessed,
  },
  friendChipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  friendChipTextActive: {
    color: colors.paperRaised,
  },
  friendHint: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
});

const dateStyles = StyleSheet.create({
  scroll: {
    gap: 6,
    paddingBottom: spacing.md,
    paddingHorizontal: 1,
  },
  chip: {
    width: 60,
    minHeight: 76,
    paddingVertical: 10,
    backgroundColor: colors.paperRecessed,
    borderRadius: radius.card,
    borderColor: colors.rule,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  chipDay: {
    ...typography.kicker,
    fontSize: 9,
    color: colors.inkMuted,
  },
  chipDayActive: {
    color: colors.paperRaised,
  },
  chipDate: {
    ...typography.metric,
    fontSize: 18,
    lineHeight: 20,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  chipDateActive: {
    color: colors.paperRaised,
  },
  chipMonth: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkMuted,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  chipMonthActive: {
    color: colors.paperRaised,
    opacity: 0.85,
  },
});
