import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants';
import Avatar from '../../src/components/Avatar';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersAPI.getMe().then((r) => r.data),
  });

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
    { icon: 'shield-outline', label: 'Privacy & Safety', onPress: () => {} },
    { icon: 'ban-outline', label: 'Blocked Users', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'log-out-outline', label: 'Log Out', onPress: logout, danger: true },
  ];

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={96} />
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        <View style={styles.stats}>
          {user.age && <Text style={styles.stat}>Age: {user.age}</Text>}
          {user.language && <Text style={styles.stat}>🌐 {user.language.toUpperCase()}</Text>}
        </View>
        {user.interests?.length > 0 && (
          <View style={styles.interests}>
            {user.interests.map((i: string) => (
              <View key={i} style={styles.interestChip}>
                <Text style={styles.interestText}>{i}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
            <Ionicons name={item.icon as any} size={22} color={(item as any).danger ? COLORS.error : COLORS.textSecondary} />
            <Text style={[styles.menuLabel, (item as any).danger && styles.danger]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: 'center', padding: 32, gap: 8 },
  name: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  username: { fontSize: 15, color: COLORS.textMuted },
  bio: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { color: COLORS.textSecondary, fontSize: 14 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  interestChip: {
    backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  interestText: { color: COLORS.primaryLight, fontSize: 13 },
  menu: { marginTop: 8, paddingBottom: 32 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 16,
  },
  menuLabel: { color: COLORS.text, fontSize: 16, flex: 1 },
  danger: { color: COLORS.error },
  chevron: { marginLeft: 'auto' },
});
