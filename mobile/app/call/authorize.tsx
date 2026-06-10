import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { callsAPI } from '../../src/services/api';
import { useCallStore } from '../../src/store/callStore';
import { showMessage } from 'react-native-flash-message';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  '513754739235-fb3scfuq6m8o4cd4ssjg2ta40d609ho1.apps.googleusercontent.com';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

export default function AuthorizeCallsScreen() {
  const router = useRouter();
  const { setGoogleAuthorized } = useCallStore();
  const [loading, setLoading] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      scopes: CALENDAR_SCOPES,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    { useProxy: true } as any,
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      handleCodeExchange(response.params.code);
    } else if (response?.type === 'error') {
      showMessage({ message: 'Authorization failed. Try again.', type: 'danger' });
    }
  }, [response]);

  const handleCodeExchange = async (code: string) => {
    setLoading(true);
    try {
      await callsAPI.authorize(code, redirectUri);
      setGoogleAuthorized(true);
      showMessage({ message: 'Google Calendar authorized!', type: 'success' });
      router.back();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Authorization failed. Try again.';
      showMessage({ message: msg, type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="logo-google" size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Authorize Calls</Text>
      <Text style={styles.body}>
        noAlone needs access to your Google Calendar to generate a secure Meet link each time you start a call.
        {'\n\n'}
        This is a one-time setup. Your calendar data is not read or stored.
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 32 }} />
      ) : (
        <Button
          title="Connect Google Calendar"
          onPress={() => promptAsync({ useProxy: true })}
          disabled={!request}
          style={styles.btn}
        />
      )}

      <Text style={styles.note}>
        You'll be prompted to sign in to Google and grant Calendar access.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 28, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  body: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  btn: { width: '100%', marginTop: 24 },
  note: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
