import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet, PressableOpacity } from '@/src/components/ui';
import { useAppData } from '@/src/data';
import { createSpendId, normalizeSpendName } from '@/src/lib/monthly-spends';
import { colors, spacing, typography } from '@/src/theme';

const categories = ['Food', 'Rent', 'Gym', 'Transport', 'Shopping', 'Bills', 'Other'];

export function SpendForm({
  visible,
  monthKey,
  onClose,
}: {
  visible: boolean;
  monthKey: string;
  onClose: () => void;
}) {
  const { setData } = useAppData();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [subCategory, setSubCategory] = useState('');
  const [note, setNote] = useState('');

  function save() {
    const parsedAmount = Number(amount);
    const normalizedName = normalizeSpendName(name || category);
    if (!normalizedName || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setData((previous) => ({
      ...previous,
      monthlySpends: {
        ...previous.monthlySpends,
        [monthKey]: [
          ...(previous.monthlySpends[monthKey] ?? []),
          {
            id: createSpendId(),
            name: normalizedName,
            amount: parsedAmount,
            recurring: false,
            details: {
              transaction: {
                date: new Date().toISOString(),
                time: new Date().toTimeString().slice(0, 5),
                category,
                subCategory: subCategory || normalizedName,
                note: note || 'None',
                amount: -parsedAmount,
              },
            },
          },
        ],
      },
    }));

    setName('');
    setAmount('');
    setSubCategory('');
    setNote('');
    onClose();
  }

  return (
    <BottomSheet visible={visible} title="Log Spend" onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Field label="Name" value={name} onChangeText={setName} placeholder={category} />
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" numeric />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {categories.map((item) => (
            <PressableOpacity key={item} onPress={() => setCategory(item)} style={styles.chip}>
              <Text style={[styles.chipText, item === category && styles.chipTextActive]}>{item}</Text>
              {item === category ? <View style={styles.underline} /> : null}
            </PressableOpacity>
          ))}
        </View>

        <Field label="Sub-cat" value={subCategory} onChangeText={setSubCategory} placeholder="PG, UPI, monthly..." />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" />

        <PressableOpacity onPress={save} style={styles.save}>
          <Text style={styles.saveText}>Save</Text>
        </PressableOpacity>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function Field({
  label,
  numeric,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; numeric?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, numeric && styles.numericInput]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.kicker,
    color: colors.inkMuted,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    borderBottomColor: colors.rule,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  numericInput: {
    ...typography.metricSm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    ...typography.subhead,
    color: colors.inkMuted,
  },
  chipTextActive: {
    color: colors.clay,
  },
  underline: {
    backgroundColor: colors.clay,
    height: 2,
    marginTop: 3,
  },
  save: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.clay,
    borderRadius: 999,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  saveText: {
    ...typography.subhead,
    color: colors.paperRaised,
  },
});
