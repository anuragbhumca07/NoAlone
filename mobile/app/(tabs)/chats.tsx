import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { chatAPI, usersAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useChatStore } from '../../src/store/chatStore';

dayjs.extend(relativeTime);

export default function ChatsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { conversations } = useChatStore();

  const { data: serverConvs = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatAPI.getConversations().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: unreadList = [] } = useQuery({
    queryKey: ['unread'],
    queryFn: () => chatAPI.getUnread().then((r) => r.data),
    refetchInterval: 15000,
  });

  const unreadMap: Record<string, number> = {};
  (unreadList as any[]).forEach((u: any) => {
    unreadMap[u.conversationId] = u.count;
  });

  // Live search with debounce
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await usersAPI.searchUsers(search.trim());
        setSearchResults(res.data);
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openChat = async (userId: string) => {
    router.push(`/chat/${userId}`);
    setSearch('');
    setSearchResults([]);
  };

  const convList = serverConvs.length > 0 ? serverConvs : [];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search people by name or username…"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search results */}
      {search.trim().length > 0 ? (
        <View style={styles.results}>
          {searchLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.noResults}>No users found for "{search}"</Text>
          ) : (
            <>
              <Text style={styles.sectionLabel}>People</Text>
              {searchResults.map((u) => (
                <TouchableOpacity key={u.id} style={styles.userItem} onPress={() => openChat(u.id)}>
                  <Avatar uri={u.avatarUrl} name={u.displayName} size={46} showOnline isOnline={u.isOnline} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.displayName}</Text>
                    <Text style={styles.userHandle}>@{u.username}</Text>
                  </View>
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      ) : (
        <>
          {convList.length > 0 && (
            <Text style={styles.sectionLabel}>Recent Conversations</Text>
          )}
          <FlatList
            data={convList}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            onRefresh={refetch}
            renderItem={({ item }) => {
              const unread = unreadMap[item.id] || 0;
              return (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => router.push(`/chat/${item.id}`)}
                >
                  <Avatar
                    uri={item.otherUser?.avatarUrl}
                    name={item.otherUser?.displayName || '?'}
                    size={52}
                    showOnline
                    isOnline={item.otherUser?.isOnline}
                  />
                  <View style={styles.info}>
                    <View style={styles.row}>
                      <Text style={[styles.name, unread > 0 && styles.nameBold]}>
                        {item.otherUser?.displayName}
                      </Text>
                      {item.lastMessage && (
                        <Text style={styles.time}>{dayjs(item.lastMessage.createdAt).fromNow()}</Text>
                      )}
                    </View>
                    <View style={styles.row}>
                      <Text
                        style={[styles.lastMsg, unread > 0 && styles.lastMsgBold]}
                        numberOfLines={1}
                      >
                        {item.lastMessage?.content || 'Say hello!'}
                      </Text>
                      {unread > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptySub}>Search for someone above to start chatting!</Text>
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },

  results: { flex: 1, paddingHorizontal: 16 },
  noResults: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },

  sectionLabel: {
    color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 8,
  },

  userItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  userHandle: { color: COLORS.textMuted, fontSize: 13 },

  item: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    gap: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  info: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600', flex: 1 },
  nameBold: { fontWeight: '800' },
  time: { color: COLORS.textMuted, fontSize: 12 },
  lastMsg: { color: COLORS.textSecondary, fontSize: 14, marginTop: 3, flex: 1 },
  lastMsgBold: { color: COLORS.text, fontWeight: '600' },

  badge: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 100, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
