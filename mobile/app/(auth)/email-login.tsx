import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

export default function EmailLoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !email.includes('@')) {
      showMessage({ message: 'Enter a valid email address', type: 'danger' });
      return;
    }
    if (!password) {
      showMessage({ message: 'Enter your password', type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.emailLogin(email.trim().toLowerCase(), password);
      const { token, user } = res.data;
      setToken(token);
      setUser(user);
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Invalid email or password';
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

      <Text style={styles.title}>Welcome{'\n'}back</Text>
      <Text style={styles.subtitle}>Sign in to your noAlone account</Text>

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
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Log In" onPress={handleLogin} loading={loading} style={styles.btn} />

      <TouchableOpacity style={styles.signupLink} onPress={() => router.push('/(auth)/email-signup')}>
        <Text style={styles.signupText}>
          Don't have an account? <Text style={styles.signupBold}>Sign up</Text>
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
  signupLink: { marginTop: 20, alignItems: 'center' },
  signupText: { color: COLORS.textMuted, fontSize: 14 },
  signupBold: { color: COLORS.primary, fontWeight: '700' },
});
