import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';
import dayjs from 'dayjs';

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    sender: { id: string; displayName: string };
  };
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={styles.text}>{message.content}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{dayjs(message.createdAt).format('HH:mm')}</Text>
          {isOwn && (
            <Text style={[styles.readStatus, message.isRead && styles.readStatusRead]}>
              {message.isRead ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginVertical: 2 },
  wrapperOwn: { alignItems: 'flex-end' },
  wrapperOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surfaceLight, borderBottomLeftRadius: 4 },
  text: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end', gap: 4 },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  readStatus: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  readStatusRead: { color: '#a78bfa' },
});
