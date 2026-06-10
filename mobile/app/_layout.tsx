import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FlashMessage from 'react-native-flash-message';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';
import { useCallStore } from '../src/store/callStore';
import { useChatSocket } from '../src/hooks/useSocket';

const queryClient = new QueryClient();

/** Handles push notification taps when app is in background */
function NotificationHandler() {
  const router = useRouter();
  const { setIncomingCall } = useCallStore();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'INCOMING_CALL') {
        setIncomingCall({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.callerName,
          callerAvatar: data.callerAvatar || null,
          callType: data.callType,
          meetLink: data.meetLink,
        });
        router.push('/call/incoming');
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

/** Listens for socket call events and auto-navigates to incoming call screen */
function CallSocketListener() {
  const router = useRouter();
  const { incomingCall } = useCallStore();
  useChatSocket();

  useEffect(() => {
    if (incomingCall) {
      router.push('/call/incoming');
    }
  }, [incomingCall?.callId]);

  return null;
}

function RootLayoutInner() {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as any;
        // Suppress system notification for incoming calls — we show our own UI
        if (data?.type === 'INCOMING_CALL') {
          return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
        }
        return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
      },
    });
  }, []);

  return (
    <>
      <NotificationHandler />
      <CallSocketListener />
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
        <Stack.Screen name="call/authorize" options={{ title: 'Authorize Calls', presentation: 'modal' }} />
        <Stack.Screen name="call/outgoing" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="call/incoming" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="call/meet-webview" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <FlashMessage position="top" />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RootLayoutInner />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
