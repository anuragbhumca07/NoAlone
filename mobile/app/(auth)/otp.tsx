import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { authAPI, usersAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      showMessage({ message: 'Enter the 6-digit OTP', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp(phone, otp);
      const { token, user, isNew } = res.data;
      setToken(token);
      setUser(user);
      if (isNew) {
        router.replace('/(auth)/setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      showMessage({ message: e?.response?.data?.message || 'Invalid OTP', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.sendOtp(phone);
      setCountdown(60);
      showMessage({ message: 'OTP resent!', type: 'success' });
    } catch {
      showMessage({ message: 'Failed to resend OTP', type: 'danger' });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Verify your{'\n'}number</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {phone}</Text>
      <Input
        label="Verification Code"
        placeholder="123456"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />
      <Button title="Verify" onPress={handleVerify} loading={loading} />
      <View style={styles.resend}>
        {countdown > 0 ? (
          <Text style={styles.countdown}>Resend OTP in {countdown}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendBtn}>Resend OTP</Text>
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
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  input: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  resend: { marginTop: 24, alignItems: 'center' },
  countdown: { color: COLORS.textMuted, fontSize: 14 },
  resendBtn: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
