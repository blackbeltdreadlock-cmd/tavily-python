import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColor';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  requestNotificationPermissions,
  getDeviceToken,
  registerDeviceToken,
  sendLocalNotification,
} from '@/lib/notifications';
import Colors from '@/constants/Colors';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    const token = await getDeviceToken();
    setDeviceToken(token);
    setNotificationsEnabled(!!token);
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        const token = await getDeviceToken();
        if (token) {
          await registerDeviceToken(token);
          setDeviceToken(token);
          setNotificationsEnabled(true);
          Alert.alert('Sucesso', 'Notificações ativadas');
        }
      } else {
        Alert.alert('Permissão negada', 'Não foi possível ativar notificações');
        setNotificationsEnabled(false);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao ativar notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    await sendLocalNotification('Teste', 'Esta é uma notificação de teste');
  };

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
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notificacoes</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Push Notifications
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                  Receba alertas sobre reviews, novos ratings e mais
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleEnableNotifications}
                disabled={loading}
                trackColor={{ false: colors.border, true: Colors.brand.primary }}
                thumbColor={notificationsEnabled ? Colors.brand.primary : colors.textSecondary}
              />
            </View>
          </Card>

          {notificationsEnabled && (
            <>
              <Card style={styles.tokenCard}>
                <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>
                  Token do dispositivo
                </Text>
                <Text style={[styles.tokenValue, { color: colors.text }]} numberOfLines={2}>
                  {deviceToken?.substring(0, 20)}...
                </Text>
              </Card>

              <Button
                title="Testar Notificacao"
                onPress={handleTestNotification}
                variant="outline"
                size="sm"
                style={styles.testButton}
              />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre</Text>
          <Card style={styles.infoCard}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              GPT Maker Platform v1.0
            </Text>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 20, paddingVertical: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  settingCard: { paddingVertical: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  settingDesc: { fontSize: 13 },
  tokenCard: { marginTop: 12, padding: 12, backgroundColor: '#f5f5f5' },
  tokenLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  tokenValue: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  testButton: { marginTop: 12 },
  infoCard: { paddingVertical: 12 },
  infoText: { fontSize: 14, textAlign: 'center' },
});
