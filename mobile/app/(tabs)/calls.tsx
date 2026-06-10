import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { callsAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatusIcon({ status, direction }: { status: string; direction: string }) {
  if (status === 'MISSED' || status === 'DECLINED') {
    return <Ionicons name="call" size={16} color={COLORS.error} style={{ transform: [{ rotate: '135deg' }] }} />;
  }
  if (direction === 'incoming') {
    return <Ionicons name="arrow-down-outline" size={16} color={COLORS.success} />;
  }
  return <Ionicons name="arrow-up-outline" size={16} color={COLORS.primary} />;
}

export default function CallsTab() {
  const router = useRouter();

  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ['callHistory'],
    queryFn: () => callsAPI.getHistory().then((r) => r.data),
  });

  const renderItem = ({ item }: { item: any }) => {
    const isMissed = item.status === 'MISSED' || item.status === 'DECLINED';
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/chat/${item.otherUser.id}`)}
      >
        <Avatar uri={item.otherUser.avatarUrl} name={item.otherUser.displayName} size={48} />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isMissed && styles.missed]}>
            {item.otherUser.displayName}
          </Text>
          <View style={styles.itemMeta}>
            <StatusIcon status={item.status} direction={item.direction} />
            <Text style={[styles.itemStatus, isMissed && styles.missed]}>
              {item.status === 'MISSED' ? 'Missed' :
               item.status === 'DECLINED' ? 'Declined' :
               item.status === 'ENDED' ? formatDuration(item.durationSeconds) || 'Ended' :
               item.status}
            </Text>
            <Ionicons
              name={item.callType === 'VIDEO' ? 'videocam-outline' : 'call-outline'}
              size={14}
              color={COLORS.textMuted}
            />
          </View>
        </View>
        <Text style={styles.itemTime}>{dayjs(item.createdAt).fromNow()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />}
        contentContainerStyle={calls.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContent}>
              <Ionicons name="call-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No calls yet</Text>
              <Text style={styles.emptySubtext}>Start a call from any chat conversation</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingTop: 8 },
  empty: { flex: 1 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 100 },
  emptyText: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  emptySubtext: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    gap: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemStatus: { color: COLORS.textMuted, fontSize: 13 },
  missed: { color: COLORS.error },
  itemTime: { color: COLORS.textMuted, fontSize: 12 },
});
