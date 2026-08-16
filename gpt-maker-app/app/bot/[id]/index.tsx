import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Bot } from '@/types';
import Colors from '@/constants/Colors';

export default function BotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { fetchBot, deleteBot } = useBotStore();
  const [bot, setBot] = useState<Bot | null>(null);

  useEffect(() => {
    if (id) fetchBot(id).then(setBot);
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Excluir Bot', `Tem certeza que deseja excluir "${bot?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deleteBot(id);
            router.back();
          }
        },
      },
    ]);
  };

  if (!bot) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: bot.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Avatar uri={bot.avatar_url} name={bot.name} size={80} />
          <Text style={[styles.name, { color: colors.text }]}>{bot.name}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {bot.description || 'Sem descricao'}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Conversar"
            onPress={() => router.push(`/bot/${id}/chat` as any)}
            size="lg"
            style={{ flex: 1 }}
          />
          <Button
            title="Editar"
            onPress={() => router.push(`/bot/${id}/edit` as any)}
            variant="outline"
            size="lg"
          />
        </View>

        <View style={styles.menu}>
          <Card onPress={() => router.push(`/bot/${id}/knowledge` as any)}>
            <View style={styles.menuRow}>
              <Ionicons name="library-outline" size={22} color={Colors.brand.primary} />
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Base de Conhecimento</Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  Documentos que o bot consulta ao responder
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Card>

          <Card onPress={() => router.push(`/bot/${id}/preview` as any)}>
            <View style={styles.menuRow}>
              <Ionicons name="flask-outline" size={22} color={Colors.brand.primary} />
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Preview</Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  Testar sem salvar no historico
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.brand.primary }]}>
              {bot.total_conversations}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversas</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.brand.primary }]}>
              {bot.total_messages}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mensagens</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.brand.primary }]}>
              {bot.rating_avg > 0 ? bot.rating_avg.toFixed(1) : '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avaliacao</Text>
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>System Prompt</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{bot.system_prompt}</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Modelo</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{bot.model}</Text>
        </Card>

        <View style={styles.dangerZone}>
          <Button title="Excluir Bot" onPress={handleDelete} variant="outline" />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  name: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  description: { fontSize: 15, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  menu: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSub: { fontSize: 13, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  infoCard: { marginHorizontal: 20, marginBottom: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 15, lineHeight: 22 },
  dangerZone: { paddingHorizontal: 20, paddingVertical: 32 },
});
