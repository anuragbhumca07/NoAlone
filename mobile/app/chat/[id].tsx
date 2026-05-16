import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatAPI } from '../../src/services/api';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { getChatSocket } from '../../src/services/socket';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import MessageBubble from '../../src/components/MessageBubble';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user: currentUser } = useAuthStore();
  const { messages, addMessage, setMessages } = useChatStore();
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    queryFn: async () => {
      // id could be a userId or conversationId
      try {
        const res = await chatAPI.getOrCreateConversation(id);
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const conversationId = conversation?.id || id;

  const { data: fetchedMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatAPI.getMessages(conversationId).then((r) => r.data),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (fetchedMessages) setMessages(conversationId, fetchedMessages);
  }, [fetchedMessages]);

  const otherUser = conversation
    ? conversation.user1Id === currentUser?.id
      ? conversation.user2
      : conversation.user1
    : null;

  useEffect(() => {
    if (otherUser) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitle}>
            <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName} size={36} showOnline isOnline={otherUser.isOnline} />
            <View>
              <Text style={styles.headerName}>{otherUser.displayName}</Text>
              <Text style={styles.headerStatus}>{otherUser.isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        ),
      });
    }
  }, [otherUser]);

  const convMessages = messages[conversationId] || [];

  const sendMessage = () => {
    if (!text.trim() || !conversationId) return;
    const socket = getChatSocket();
    if (socket) {
      socket.emit('message:send', {
        conversationId,
        targetUserId: otherUser?.id,
        content: text.trim(),
        type: 'TEXT',
      });
    }
    setText('');
  };

  const handleTyping = (t: string) => {
    setText(t);
    const socket = getChatSocket();
    if (socket && otherUser) {
      clearTimeout(typingTimer.current);
      socket.emit('message:typing', { conversationId, targetUserId: otherUser.id });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.senderId === currentUser?.id} />
        )}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={handleTyping}
          placeholder="Message..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  headerStatus: { color: COLORS.textMuted, fontSize: 12 },
  messages: { paddingVertical: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, color: COLORS.text, fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
});
