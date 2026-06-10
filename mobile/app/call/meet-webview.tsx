import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';

export default function MeetWebViewScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();
  const [loading, setLoading] = useState(true);

  if (!url) {
    router.back();
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Google Meet</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Opening Meet...</Text>
        </View>
      )}

      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  barTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },
});
