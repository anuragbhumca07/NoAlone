import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/constants';

export default function Index() {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)' : '/(auth)/welcome'} />;
}
