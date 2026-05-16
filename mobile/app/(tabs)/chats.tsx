import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { chatAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function ChatsScreen() {
  const router = useRouter();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatAPI.getConversations().then((r) => r.data),
    refetchInterval: 10000,
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations || []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <Avatar
              uri={item.otherUser?.avatarUrl}
              name={item.otherUser?.displayName || '?'}
              size={54}
              showOnline
              isOnline={item.otherUser?.isOnline}
            />
            <View style={styles.info}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.otherUser?.displayName}</Text>
                {item.lastMessage && (
                  <Text style={styles.time}>{dayjs(item.lastMessage.createdAt).fromNow()}</Text>
                )}
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.lastMessage?.content || 'Start chatting!'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Discover people or try matching!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    gap: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  info: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  time: { color: COLORS.textMuted, fontSize: 12 },
  lastMsg: { color: COLORS.textSecondary, fontSize: 14, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 120, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14 },
});
