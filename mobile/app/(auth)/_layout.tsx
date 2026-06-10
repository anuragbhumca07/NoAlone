import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="email-signup" />
      <Stack.Screen name="email-verify" />
      <Stack.Screen name="email-login" />
    </Stack>
  );
}
