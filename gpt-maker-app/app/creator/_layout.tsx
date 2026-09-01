import { Stack } from 'expo-router';

export default function CreatorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="favorites" />
    </Stack>
  );
}
