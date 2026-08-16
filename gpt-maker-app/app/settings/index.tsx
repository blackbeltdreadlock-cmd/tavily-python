import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColor';

export default function SettingsScreen() {
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Configuracoes',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
          Configuracoes em breve...
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { fontSize: 16 },
});
