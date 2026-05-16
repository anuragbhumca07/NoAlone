import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { roomsAPI } from '../../src/services/api';
import { getChatSocket, connectChatSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user: currentUser } = useAuthStore();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'chat' | 'members'>('chat');

  const { data: room } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsAPI.getRoom(id).then((r) => r.data),
  });

  const { data: history } = useQuery({
    queryKey: ['roomMessages', id],
    queryFn: () => roomsAPI.getRoomMessages(id).then((r) => r.data),
  });

  useEffect(() => {
    if (history) setMessages(history);
  }, [history]);

  useEffect(() => {
    if (!token) return;
    const socket = connectChatSocket(token);
    socket.emit('room:join', { roomId: id });

    socket.on('room:message_new', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit('room:leave', { roomId: id });
      socket.off('room:message_new');
    };
  }, [token, id]);

  useEffect(() => {
    if (room) navigation.setOptions({ headerTitle: room.name });
  }, [room]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const socket = getChatSocket();
    if (socket) {
      socket.emit('room:message', { roomId: id, content: text.trim() });
    }
    setText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {['chat', 'members'].map((t) => (
          <TouchableOpacity
            key={t} style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t as any)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chat' ? 'Chat' : `Members (${room?._count?.members || 0})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'chat' ? (
        <>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.msg}>
                <Avatar uri={item.sender?.avatarUrl} name={item.sender?.displayName} size={32} />
                <View style={styles.msgContent}>
                  <Text style={styles.msgSender}>{item.sender?.displayName}</Text>
                  <Text style={styles.msgText}>{item.content}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.messages}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Message room..."
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={room?.members || []}
          keyExtractor={(item: any) => item.userId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }: any) => (
            <View style={styles.member}>
              <Avatar uri={item.user?.avatarUrl} name={item.user?.displayName} size={44} showOnline isOnline={item.user?.isOnline} />
              <View>
                <Text style={styles.memberName}>{item.user?.displayName}</Text>
                <Text style={styles.memberRole}>{item.role}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  messages: { padding: 16, gap: 12 },
  msg: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  msgContent: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 10 },
  msgSender: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  msgText: { color: COLORS.text, fontSize: 14 },
  inputRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, padding: 14, borderRadius: 14 },
  memberName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  memberRole: { color: COLORS.textMuted, fontSize: 12, textTransform: 'capitalize' },
});
