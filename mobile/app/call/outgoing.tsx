import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { callsAPI } from '../../src/services/api';
import { useCallStore } from '../../src/store/callStore';
import { getChatSocket } from '../../src/services/socket';
import { showMessage } from 'react-native-flash-message';

const RING_TIMEOUT = 30_000;

export default function OutgoingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    callId: string; receiverName: string; receiverAvatar: string; callType: string;
  }>();

  const { outgoingCall, clearCalls } = useCallStore();
  const [status, setStatus] = useState<'calling' | 'accepted' | 'declined' | 'missed'>('calling');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callId = outgoingCall?.callId || params.callId;
  const receiverName = outgoingCall?.receiverName || params.receiverName || 'User';
  const receiverAvatar = outgoingCall?.receiverAvatar || params.receiverAvatar || null;
  const callType = (outgoingCall?.callType || params.callType || 'VOICE') as 'VOICE' | 'VIDEO';

  // Pulse animation for "Calling..."
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Auto-cancel after ring timeout
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStatus('missed');
      showMessage({ message: 'No answer', type: 'warning' });
      setTimeout(() => handleClose(), 2000);
    }, RING_TIMEOUT);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Listen for call events via socket
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !callId) return;

    const onAccepted = (data: { callId: string; meetLink: string }) => {
      if (data.callId !== callId) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus('accepted');
      openMeetLink(data.meetLink);
    };

    const onDeclined = (data: { callId: string }) => {
      if (data.callId !== callId) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus('declined');
      showMessage({ message: `${receiverName} declined the call`, type: 'info' });
      setTimeout(() => handleClose(), 2000);
    };

    socket.on('call:accepted', onAccepted);
    socket.on('call:declined', onDeclined);
    return () => {
      socket.off('call:accepted', onAccepted);
      socket.off('call:declined', onDeclined);
    };
  }, [callId]);

  const openMeetLink = async (link: string) => {
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        router.replace({ pathname: '/call/meet-webview', params: { url: link } });
        return;
      }
    } catch {
      router.replace({ pathname: '/call/meet-webview', params: { url: link } });
      return;
    }
    setTimeout(() => handleClose(), 500);
  };

  const handleHangUp = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (callId) {
      try { await callsAPI.cancel(callId); } catch {}
    }
    handleClose();
  };

  const handleClose = () => {
    clearCalls();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.callTypeLabel}>
        {callType === 'VIDEO' ? 'Video Call' : 'Voice Call'}
      </Text>

      <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Avatar uri={receiverAvatar || undefined} name={receiverName} size={120} />
      </Animated.View>

      <Text style={styles.name}>{receiverName}</Text>

      <Text style={styles.status}>
        {status === 'calling' ? 'Calling...' :
         status === 'accepted' ? 'Connected!' :
         status === 'declined' ? 'Call Declined' : 'No Answer'}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.hangUpBtn} onPress={handleHangUp}>
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
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
  callTypeLabel: {
    color: COLORS.textMuted, fontSize: 14, fontWeight: '600', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 40,
  },
  avatarWrap: { marginBottom: 28 },
  name: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  status: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 60 },
  controls: { position: 'absolute', bottom: 80 },
  hangUpBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.error, shadowOpacity: 0.5, shadowRadius: 12,
  },
});
