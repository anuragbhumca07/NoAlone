import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, INTERESTS, LANGUAGES } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { usersAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { showMessage } from 'react-native-flash-message';

export default function SetupScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest].slice(0, 5),
    );
  };

  const handleComplete = async () => {
    if (!displayName.trim()) {
      showMessage({ message: 'Enter your display name', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      const res = await usersAPI.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        age: age ? parseInt(age) : undefined,
        interests: selectedInterests,
        language: selectedLanguage,
      });
      setUser(res.data);
      router.replace('/(tabs)');
    } catch (e: any) {
      showMessage({ message: 'Failed to save profile', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set up your{'\n'}profile</Text>
      <Text style={styles.subtitle}>Tell us about yourself</Text>

      <Input label="Display Name *" placeholder="How should people call you?" value={displayName} onChangeText={setDisplayName} />
      <Input label="Bio" placeholder="Something about you..." value={bio} onChangeText={setBio} multiline numberOfLines={3} />
      <Input label="Age" placeholder="Your age" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />

      <Text style={styles.sectionTitle}>Language</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.chip, selectedLanguage === lang.code && styles.chipActive]}
            onPress={() => setSelectedLanguage(lang.code)}
          >
            <Text style={[styles.chipText, selectedLanguage === lang.code && styles.chipTextActive]}>
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Interests (pick up to 5)</Text>
      <View style={styles.interestGrid}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[styles.chip, selectedInterests.includes(interest) && styles.chipActive]}
            onPress={() => toggleInterest(interest)}
          >
            <Text style={[styles.chipText, selectedInterests.includes(interest) && styles.chipTextActive]}>
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Complete Setup" onPress={handleComplete} loading={loading} style={styles.btn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 42 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 32 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  chips: { marginBottom: 16 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  chipText: { color: COLORS.textSecondary, fontSize: 14 },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
  btn: { marginTop: 8 },
});
