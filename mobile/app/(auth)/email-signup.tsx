import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { authAPI } from '../../src/services/api';
import { showMessage } from 'react-native-flash-message';

export default function EmailSignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !email.includes('@')) {
      showMessage({ message: 'Enter a valid email address', type: 'danger' });
      return;
    }
    if (password.length < 8) {
      showMessage({ message: 'Password must be at least 8 characters', type: 'danger' });
      return;
    }
    if (password !== confirm) {
      showMessage({ message: 'Passwords do not match', type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.emailRegister(email.trim().toLowerCase(), password);
      showMessage({ message: 'Verification code sent! Check your email.', type: 'success' });
      router.push({ pathname: '/(auth)/email-verify', params: { email: email.trim().toLowerCase() } });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Registration failed. Try again.';
      showMessage({ message: msg, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create your{'\n'}account</Text>
      <Text style={styles.subtitle}>We'll send a verification code to your email</Text>

      <Input
        label="Email Address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Password"
        placeholder="At least 8 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Input
        label="Confirm Password"
        placeholder="Repeat your password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      <Button title="Send Verification Code" onPress={handleRegister} loading={loading} style={styles.btn} />

      <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/email-login')}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginBold}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 42 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 32 },
  btn: { marginTop: 8 },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginText: { color: COLORS.textMuted, fontSize: 14 },
  loginBold: { color: COLORS.primary, fontWeight: '700' },
});
