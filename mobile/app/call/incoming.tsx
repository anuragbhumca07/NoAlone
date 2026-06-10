import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { callsAPI } from '../../src/services/api';
import { useCallStore } from '../../src/store/callStore';
import { showMessage } from 'react-native-flash-message';

const AUTO_DISMISS_MS = 32_000;

export default function IncomingCallScreen() {
  const router = useRouter();
  const { incomingCall, setIncomingCall } = useCallStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    autoDismissRef.current = setTimeout(() => {
      setIncomingCall(null);
      router.back();
    }, AUTO_DISMISS_MS);

    return () => {
      pulse.stop();
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, []);

  if (!incomingCall) {
    router.back();
    return null;
  }

  const openMeetLink = async (link: string) => {
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
        setIncomingCall(null);
        router.back();
      } else {
        setIncomingCall(null);
        router.replace({ pathname: '/call/meet-webview', params: { url: link } });
      }
    } catch {
      setIncomingCall(null);
      router.replace({ pathname: '/call/meet-webview', params: { url: link } });
    }
  };

  const handleAccept = async () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    try {
      const res = await callsAPI.accept(incomingCall.callId);
      const { meetLink } = res.data;
      await openMeetLink(meetLink || incomingCall.meetLink);
    } catch (e: any) {
      showMessage({ message: e?.response?.data?.message || 'Could not connect', type: 'danger' });
      setIncomingCall(null);
      router.back();
    }
  };

  const handleDecline = async () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    try {
      await callsAPI.decline(incomingCall.callId);
    } catch {}
    showMessage({ message: 'Call declined', type: 'info' });
    setIncomingCall(null);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Incoming {incomingCall.callType === 'VIDEO' ? 'Video' : 'Voice'} Call
      </Text>

      <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Avatar
          uri={incomingCall.callerAvatar || undefined}
          name={incomingCall.callerName}
          size={130}
        />
      </Animated.View>

      <Text style={styles.name}>{incomingCall.callerName}</Text>
      <Text style={styles.subtitle}>is calling you...</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
          <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
          <Ionicons name="call" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  label: {
    color: COLORS.primary, fontSize: 13, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 40,
  },
  avatarWrap: { marginBottom: 28 },
  name: { fontSize: 30, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 64 },
  actions: { flexDirection: 'row', gap: 48, position: 'absolute', bottom: 80 },
  declineBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.error, shadowOpacity: 0.5, shadowRadius: 12,
  },
  acceptBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.success, shadowOpacity: 0.5, shadowRadius: 12,
  },
});
