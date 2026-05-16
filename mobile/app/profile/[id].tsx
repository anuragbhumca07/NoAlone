import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersAPI, chatAPI, moderationAPI } from '../../src/services/api';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import Button from '../../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersAPI.getUser(id).then((r) => r.data),
  });

  const blockMutation = useMutation({
    mutationFn: () => moderationAPI.blockUser(id),
    onSuccess: () => { showMessage({ message: 'User blocked', type: 'success' }); router.back(); },
    onError: () => showMessage({ message: 'Failed to block', type: 'danger' }),
  });

  const reportMutation = useMutation({
    mutationFn: () => moderationAPI.reportUser({ reportedUserId: id, reason: 'SPAM' }),
    onSuccess: () => showMessage({ message: 'Report submitted', type: 'success' }),
    onError: () => showMessage({ message: 'Failed to report', type: 'danger' }),
  });

  const startChat = async () => {
    router.push(`/chat/${id}`);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={100} showOnline isOnline={user.isOnline} />
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.isVerified && (
          <View style={styles.verified}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      <View style={styles.actions}>
        <Button title="Send Message" onPress={startChat} style={styles.msgBtn} />
      </View>

      <View style={styles.section}>
        {user.interests?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.chips}>
              {user.interests.map((i: string) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{i}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.dangerBtn} onPress={() => reportMutation.mutate()}>
          <Ionicons name="flag-outline" size={18} color={COLORS.warning} />
          <Text style={styles.dangerTextWarn}>Report User</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerBtn} onPress={() => blockMutation.mutate()}>
          <Ionicons name="ban-outline" size={18} color={COLORS.error} />
          <Text style={styles.dangerText}>Block User</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: 'center', padding: 32, gap: 8 },
  name: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  username: { color: COLORS.textMuted, fontSize: 15 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { color: COLORS.primary, fontSize: 13 },
  bio: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15 },
  actions: { paddingHorizontal: 28, marginBottom: 24 },
  msgBtn: {},
  section: { paddingHorizontal: 28, marginBottom: 24 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  chipText: { color: COLORS.primaryLight, fontSize: 13 },
  dangerZone: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 40 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dangerText: { color: COLORS.error, fontSize: 15 },
  dangerTextWarn: { color: COLORS.warning, fontSize: 15 },
});
