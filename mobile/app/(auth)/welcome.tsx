import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const res = await authAPI.guestLogin();
      const { token, user } = res.data;
      setToken(token);
      setUser(user);
      router.replace('/(auth)/setup');
    } catch (e: any) {
      showMessage({ message: 'Could not connect. Check your internet.', type: 'danger' });
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🤝</Text>
        </View>
        <Text style={styles.appName}>noAlone</Text>
        <Text style={styles.tagline}>Make real friends.{'\n'}Have real conversations.</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: 'chatbubbles', text: 'Chat with new people' },
          { icon: 'mic', text: 'Join live voice rooms' },
          { icon: 'people', text: 'Find your community' },
        ].map((f) => (
          <View key={f.text} style={styles.feature}>
            <Ionicons name={f.icon as any} size={22} color={COLORS.primary} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Get Started with Phone" onPress={() => router.push('/(auth)/phone')} />
        <Text style={styles.orText}>— or —</Text>
        <TouchableOpacity style={styles.googleBtn} onPress={() => {}}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuestLogin} disabled={guestLoading}>
          {guestLoading ? (
            <ActivityIndicator color={COLORS.textMuted} size="small" />
          ) : (
            <Text style={styles.guestText}>Skip for now — Try as Guest</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 20,
  },
  logoEmoji: { fontSize: 48 },
  appName: { fontSize: 40, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  tagline: { fontSize: 18, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 28 },
  features: { gap: 16, marginBottom: 40 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, padding: 16, borderRadius: 14 },
  featureText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  actions: { paddingBottom: 48, gap: 8 },
  orText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 14, marginVertical: 8 },
  googleBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1.5, borderColor: COLORS.border,
  },
  googleText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  guestBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  guestText: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'underline' },
  terms: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
});
