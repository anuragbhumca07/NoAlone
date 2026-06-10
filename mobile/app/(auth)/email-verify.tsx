import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

export default function EmailVerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      showMessage({ message: 'Enter the 6-digit code from your email', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.emailVerify(email, code);
      const { token, user, isNew } = res.data;
      setToken(token);
      setUser(user);
      showMessage({ message: 'Email verified!', type: 'success' });
      router.replace(isNew ? '/(auth)/setup' : '/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Invalid or expired code';
      showMessage({ message: msg, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      // We don't store password here so we can't re-register; direct user back
      showMessage({
        message: 'Go back and submit the form again to resend the code.',
        type: 'info',
        duration: 4000,
      });
    } finally {
      setResendLoading(false);
      setCountdown(60);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Check your{'\n'}email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      <Input
        label="Verification Code"
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.codeInput}
      />

      <Button title="Verify Email" onPress={handleVerify} loading={loading} />

      <View style={styles.resend}>
        {countdown > 0 ? (
          <Text style={styles.countdown}>Resend code in {countdown}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
            <Text style={styles.resendBtn}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 42 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40, lineHeight: 24 },
  email: { color: COLORS.text, fontWeight: '600' },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  resend: { marginTop: 24, alignItems: 'center' },
  countdown: { color: COLORS.textMuted, fontSize: 14 },
  resendBtn: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
