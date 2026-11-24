import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function ThemedInput({ style, multiline, ...rest }: TextInputProps) {
  const { colors } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[
        styles.input,
        multiline && styles.multiline,
        { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
