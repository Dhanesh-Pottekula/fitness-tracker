import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export function PressableOpacity({
  children,
  style,
  ...props
}: PressableProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable style={({ pressed }) => [style, pressed && { opacity: 0.65 }]} {...props}>
      {children}
    </Pressable>
  );
}
