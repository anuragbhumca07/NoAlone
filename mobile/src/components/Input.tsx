import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { COLORS } from '../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          focused && styles.focused,
          error && styles.error,
          style,
        ]}
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  focused: { borderColor: COLORS.primary },
  error: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 4 },
});
