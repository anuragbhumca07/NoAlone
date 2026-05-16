import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlashMessage from 'react-native-flash-message';
import { useAuthStore } from '../src/store/authStore';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0f0f1a' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#0f0f1a' },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: '' }} />
          <Stack.Screen name="room/[id]" options={{ title: '' }} />
          <Stack.Screen name="profile/[id]" options={{ title: 'Profile' }} />
          <Stack.Screen name="matching" options={{ title: '', headerTransparent: true }} />
        </Stack>
        <FlashMessage position="top" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
