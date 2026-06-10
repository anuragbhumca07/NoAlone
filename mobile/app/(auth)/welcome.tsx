import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  '513754739235-fb3scfuq6m8o4cd4ssjg2ta40d609ho1.apps.googleusercontent.com';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        handleGoogleLogin(accessToken);
      }
    } else if (response?.type === 'error') {
      showMessage({ message: 'Google sign-in failed. Try again.', type: 'danger' });
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      const res = await authAPI.googleMobileLogin(accessToken);
      const { token, user, isNew } = res.data;
      setToken(token);
      setUser(user);
      router.replace(isNew ? '/(auth)/setup' : '/(tabs)');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Google sign-in failed. Try again.';
      showMessage({ message: msg, type: 'danger' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (!request) return;
    await promptAsync({ useProxy: true });
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
        {/* Google Sign-In */}
        <TouchableOpacity
          style={[styles.googleBtn, (!request || googleLoading) && styles.btnDisabled]}
          onPress={handleGooglePress}
          disabled={!request || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.orText}>— or —</Text>

        {/* Phone OTP */}
        <Button
          title="Continue with Phone"
          onPress={() => router.push('/(auth)/phone')}
          style={styles.phoneBtn}
        />

        {/* Email Sign-Up / Login */}
        <TouchableOpacity
          style={styles.emailBtn}
          onPress={() => router.push('/(auth)/email-signup')}
        >
          <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
          <Text style={styles.emailBtnText}>Sign up with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/email-login')}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
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
  features: { gap: 12, marginBottom: 32 },
  feature: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, padding: 14, borderRadius: 14,
  },
  featureText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  actions: { paddingBottom: 48, gap: 10 },
  googleBtn: {
    height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, backgroundColor: '#4285F4',
  },
  btnDisabled: { opacity: 0.6 },
  googleText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  orText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 14, marginVertical: 2 },
  phoneBtn: { marginTop: 0 },
  emailBtn: {
    height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15`,
  },
  emailBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  loginLink: { alignItems: 'center', paddingVertical: 4 },
  loginLinkText: { color: COLORS.textMuted, fontSize: 14 },
  loginLinkBold: { color: COLORS.primary, fontWeight: '700' },
  terms: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
