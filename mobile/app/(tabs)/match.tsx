import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import { connectMatchingSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/store/authStore';
import { chatAPI } from '../../src/services/api';
import { showMessage } from 'react-native-flash-message';
import Avatar from '../../src/components/Avatar';

type State = 'idle' | 'searching' | 'matched';

export default function MatchScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [state, setState] = useState<State>('idle');
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const startMatching = () => {
    if (!token) return;
    setState('searching');

    const socket = connectMatchingSocket(token);

    socket.emit('match:search', { language: user?.language, interests: user?.interests });

    socket.on('match:found', async (data) => {
      setState('matched');
      setMatchedUser(data.user);
      setConversationId(data.conversationId);
      socket.off('match:found');
      socket.off('match:timeout');
    });

    socket.on('match:timeout', () => {
      setState('idle');
      showMessage({ message: 'No match found. Try again!', type: 'warning' });
      socket.off('match:found');
      socket.off('match:timeout');
    });
  };

  const cancelMatching = () => {
    setState('idle');
    const socket = connectMatchingSocket(token!);
    socket.emit('match:cancel');
  };

  const startChat = () => {
    if (conversationId) {
      router.push(`/chat/${conversationId}`);
    }
  };

  if (state === 'matched' && matchedUser) {
    return (
      <View style={styles.container}>
        <View style={styles.matchCard}>
          <Text style={styles.matchEmoji}>🎉</Text>
          <Text style={styles.matchTitle}>You matched!</Text>
          <Avatar uri={matchedUser.avatarUrl} name={matchedUser.displayName} size={96} />
          <Text style={styles.matchName}>{matchedUser.displayName}</Text>
          <Text style={styles.matchSubtext}>Say hi and start a conversation!</Text>
          <Button title="Start Chatting" onPress={startChat} style={styles.chatBtn} />
          <TouchableOpacity onPress={() => setState('idle')}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{state === 'searching' ? '🔍' : '💫'}</Text>
        <Text style={styles.title}>
          {state === 'searching' ? 'Finding someone...' : 'Random Match'}
        </Text>
        <Text style={styles.subtitle}>
          {state === 'searching'
            ? 'Looking for someone with similar interests'
            : 'Connect with a random person who shares your vibe'}
        </Text>
      </View>

      {state === 'idle' ? (
        <Button title="Start Matching" onPress={startMatching} style={styles.btn} />
      ) : (
        <View style={styles.searchingContainer}>
          <View style={styles.pulse} />
          <Button title="Cancel" onPress={cancelMatching} variant="outline" style={styles.btn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 48, gap: 16 },
  emoji: { fontSize: 80 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  btn: { marginTop: 8 },
  searchingContainer: { alignItems: 'center', gap: 16 },
  pulse: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${COLORS.primary}30`, borderWidth: 2, borderColor: COLORS.primary,
    marginBottom: 16,
  },
  matchCard: { alignItems: 'center', gap: 16, backgroundColor: COLORS.surface, borderRadius: 24, padding: 32 },
  matchEmoji: { fontSize: 48 },
  matchTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  matchName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  matchSubtext: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  chatBtn: { width: '100%' },
  skipText: { color: COLORS.textMuted, fontSize: 15, marginTop: 8 },
});
