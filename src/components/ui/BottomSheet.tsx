import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/src/theme';

import { PressableOpacity } from './PressableOpacity';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.9, SCREEN_HEIGHT - 40);

export function BottomSheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safe}>
            <View style={styles.handle} />
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <PressableOpacity onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>Close</Text>
              </PressableOpacity>
            </View>
            <View style={styles.content}>{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(29, 29, 31, 0.22)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.paperRaised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    height: SHEET_HEIGHT,
  },
  safe: {
    flex: 1,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.rule,
    borderRadius: 999,
    height: 4,
    marginBottom: spacing.lg,
    width: 36,
  },
  head: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.kicker,
    color: colors.inkMuted,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    ...typography.subhead,
    color: colors.clay,
  },
  content: {
    flex: 1,
  },
});
