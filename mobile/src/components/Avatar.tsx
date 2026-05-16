import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

export default function Avatar({ uri, name, size = 48, showOnline, isOnline }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              bottom: 0,
              right: 0,
              backgroundColor: isOnline ? COLORS.online : COLORS.offline,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  placeholder: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontWeight: '700' },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});
