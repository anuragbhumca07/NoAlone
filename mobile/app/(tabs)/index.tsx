import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { useChatSocket } from '../../src/hooks/useSocket';

export default function DiscoverScreen() {
  const router = useRouter();
  useChatSocket();

  const { data: onlineUsers, isLoading, refetch } = useQuery({
    queryKey: ['onlineUsers'],
    queryFn: () => usersAPI.getOnlineUsers().then((r) => r.data),
    refetchInterval: 30000,
  });

  const handleChat = async (userId: string) => {
    router.push(`/chat/${userId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {onlineUsers?.length || 0} people online now
        </Text>
      </View>

      <FlatList
        data={onlineUsers || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleChat(item.id)}>
            <Avatar uri={item.avatarUrl} name={item.displayName} size={64} showOnline isOnline />
            <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
            {item.interests?.length > 0 && (
              <Text style={styles.interest} numberOfLines={1}>
                {item.interests[0]}
              </Text>
            )}
            <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(item.id)}>
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyText}>No one online right now</Text>
            <Text style={styles.emptySubtext}>Try matching to find someone!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14 },
  grid: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    flex: 1, margin: 8, backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 16, alignItems: 'center', gap: 8,
  },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  interest: { color: COLORS.textMuted, fontSize: 12 },
  chatBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, marginTop: 4,
  },
  chatBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14 },
});
