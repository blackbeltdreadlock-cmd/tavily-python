import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColor';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBackground,
            color: colors.text,
            borderColor: error ? '#e74c3c' : colors.border,
          },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: { color: '#e74c3c', fontSize: 12, marginTop: 4 },
});
