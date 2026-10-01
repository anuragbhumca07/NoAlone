import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { usersAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, INTERESTS, LANGUAGES } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import { showMessage } from 'react-native-flash-message';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersAPI.getMe().then((r) => r.data),
  });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [language, setLanguage] = useState('en');
  const [gender, setGender] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAge(user.age ? String(user.age) : '');
      setLanguage(user.language || 'en');
      setGender(user.gender || '');
      setInterests(user.interests || []);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersAPI.updateMe(data),
    onSuccess: (res) => {
      setUser(res.data);
      qc.invalidateQueries({ queryKey: ['me'] });
      showMessage({ message: 'Profile updated!', type: 'success' });
      router.back();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Failed to update profile';
      showMessage({ message: msg, type: 'danger' });
    },
  });

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest].slice(0, 5),
    );
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      showMessage({ message: 'Display name is required', type: 'danger' });
      return;
    }
    updateMutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim() || null,
      age: age ? parseInt(age, 10) : null,
      language,
      gender: gender || null,
      interests,
    });
  };

  if (isLoading || !user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar placeholder */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitials}>
              {displayName ? displayName[0].toUpperCase() : '?'}
            </Text>
          )}
        </View>
        <Text style={styles.avatarHint}>Avatar is set via your account</Text>
      </View>

      {/* Display name */}
      <Text style={styles.label}>Display Name *</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your display name"
        placeholderTextColor={COLORS.textMuted}
        maxLength={40}
      />

      {/* Bio */}
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people about yourself…"
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={3}
        maxLength={200}
      />

      {/* Age */}
      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        value={age}
        onChangeText={setAge}
        placeholder="Your age"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="number-pad"
        maxLength={3}
      />

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>
      <View style={styles.chipRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.chip, gender === g.value && styles.chipActive]}
            onPress={() => setGender(g.value)}
          >
            <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Language */}
      <Text style={styles.label}>Language</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.chip, language === lang.code && styles.chipActive, { marginRight: 8 }]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={[styles.chipText, language === lang.code && styles.chipTextActive]}>
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Interests */}
      <Text style={styles.label}>Interests (up to 5)</Text>
      <View style={styles.chipGrid}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[styles.chip, interests.includes(interest) && styles.chipActive]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[styles.chipText, interests.includes(interest) && styles.chipTextActive]}>
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={updateMutation.isPending}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarInitials: { color: '#fff', fontSize: 36, fontWeight: '800' },
  avatarHint: { color: COLORS.textMuted, fontSize: 13 },

  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  textarea: { height: 90, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  chipText: { color: COLORS.textSecondary, fontSize: 13 },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },

  saveBtn: { marginTop: 28 },
});
