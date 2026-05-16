import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { showMessage } from 'react-native-flash-message';

export default function RoomsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [filter, setFilter] = useState<'all' | 'live'>('all');

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['rooms', filter],
    queryFn: () => roomsAPI.getRooms(filter === 'live' ? { isLive: true } : {}).then((r) => r.data),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => roomsAPI.createRoom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setShowCreate(false);
      setRoomName('');
      setRoomDesc('');
      showMessage({ message: 'Room created!', type: 'success' });
    },
    onError: () => showMessage({ message: 'Failed to create room', type: 'danger' }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {['all', 'live'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f as any)}
          >
            {f === 'live' && <View style={styles.liveDot} />}
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All Rooms' : 'Live Now'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms || []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.roomCard} onPress={() => router.push(`/room/${item.id}`)}>
            <View style={styles.roomHeader}>
              <Text style={styles.roomName}>{item.name}</Text>
              {item.isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            {item.description && <Text style={styles.roomDesc} numberOfLines={2}>{item.description}</Text>}
            <View style={styles.roomMeta}>
              <Ionicons name="people" size={14} color={COLORS.textMuted} />
              <Text style={styles.memberCount}>{item._count?.members || 0} members</Text>
              {item.topic && <Text style={styles.topic}>#{item.topic}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Room</Text>
            <Input label="Room Name *" placeholder="My awesome room" value={roomName} onChangeText={setRoomName} />
            <Input label="Description" placeholder="What's this room about?" value={roomDesc} onChangeText={setRoomDesc} />
            <Button
              title="Create"
              onPress={() => createMutation.mutate({ name: roomName, description: roomDesc })}
              loading={createMutation.isPending}
            />
            <Button title="Cancel" onPress={() => setShowCreate(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: 'center' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  filterBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  filterText: { color: COLORS.textSecondary, fontSize: 14 },
  filterTextActive: { color: COLORS.primary, fontWeight: '600' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error },
  createBtn: {
    marginLeft: 'auto', width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: 16, gap: 12 },
  roomCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  roomName: { color: COLORS.text, fontSize: 17, fontWeight: '700', flex: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.error}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  liveText: { color: COLORS.error, fontSize: 11, fontWeight: '700' },
  roomDesc: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 10 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberCount: { color: COLORS.textMuted, fontSize: 13 },
  topic: { color: COLORS.primaryLight, fontSize: 13, marginLeft: 8 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, gap: 8 },
  modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },
});
