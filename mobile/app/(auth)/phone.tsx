import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { authAPI } from '../../src/services/api';
import { showMessage } from 'react-native-flash-message';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      showMessage({ message: 'Enter a valid phone number', type: 'danger' });
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    setLoading(true);
    try {
      await authAPI.sendOtp(formattedPhone);
      router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
    } catch (e: any) {
      showMessage({ message: e?.response?.data?.message || 'Failed to send OTP', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Enter your{'\n'}phone number</Text>
      <Text style={styles.subtitle}>We'll send you a verification code</Text>
      <Input
        label="Phone Number"
        placeholder="+91 98765 43210"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={15}
        style={styles.input}
      />
      <Button title="Send OTP" onPress={handleSendOtp} loading={loading} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 28, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 42 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 40 },
  input: { fontSize: 18 },
  btn: { marginTop: 8 },
});
