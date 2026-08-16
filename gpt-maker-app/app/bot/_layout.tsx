import { Stack } from 'expo-router';

export default function BotLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/chat" />
      <Stack.Screen name="[id]/knowledge" />
      <Stack.Screen name="[id]/preview" />
    </Stack>
  );
}
