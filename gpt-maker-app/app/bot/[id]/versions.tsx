import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Modal, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useVersionStore } from '@/stores/versionStore';
import { useBotStore } from '@/stores/botStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { BotVersion } from '@/types';
import Colors from '@/constants/Colors';

export default function VersionsScreen() {
  const { id: botId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { versions, loading, fetchVersions, rollbackToVersion } = useVersionStore();
  const { fetchBot } = useBotStore();
  const [selectedVersion, setSelectedVersion] = useState<BotVersion | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (botId) {
      fetchVersions(botId);
    }
  }, [botId]);

  const handleRollback = async (version: BotVersion) => {
    Alert.alert('Restaurar versão', `Restaurar para versão ${version.version_number}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar',
        style: 'destructive',
        onPress: async () => {
          try {
            setRolling(true);
            await rollbackToVersion(botId!, version.version_number);
            await fetchBot(botId!);
            Alert.alert('Sucesso', 'Bot restaurado para esta versão');
            setSelectedVersion(null);
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          } finally {
            setRolling(false);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Historico de Versoes',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={versions}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => botId && fetchVersions(botId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              onPress={() => setSelectedVersion(item)}
              style={styles.versionCard}
            >
              <View style={styles.versionHeader}>
                <View>
                  <Text style={[styles.versionLabel, { color: colors.text }]}>
                    Versao {item.version_number}
                  </Text>
                  <Text style={[styles.versionDate, { color: colors.textSecondary }]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.versionMeta}>
                <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
                  {item.model}
                </Text>
                <Text style={[styles.metaValue, { color: colors.textSecondary }]}>
                  Temp: {item.temperature}
                </Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma versao encontrada
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      <Modal visible={!!selectedVersion} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Versao {selectedVersion?.version_number}
              </Text>
              <Pressable onPress={() => setSelectedVersion(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {selectedVersion && (
                <>
                  <View style={styles.diffSection}>
                    <Text style={[styles.diffLabel, { color: colors.text }]}>System Prompt</Text>
                    <Card style={{ ...styles.diffCard, backgroundColor: colors.border } as any}>
                      <Text style={[styles.diffValue, { color: colors.text }]} numberOfLines={6}>
                        {selectedVersion.system_prompt}
                      </Text>
                    </Card>
                  </View>

                  {selectedVersion.welcome_message && (
                    <View style={styles.diffSection}>
                      <Text style={[styles.diffLabel, { color: colors.text }]}>Mensagem de Boas-vindas</Text>
                      <Card style={{ ...styles.diffCard, backgroundColor: colors.border } as any}>
                        <Text style={[styles.diffValue, { color: colors.text }]}>
                          {selectedVersion.welcome_message}
                        </Text>
                      </Card>
                    </View>
                  )}

                  <View style={styles.configGrid}>
                    <View style={styles.configItem}>
                      <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Modelo</Text>
                      <Text style={[styles.configValue, { color: colors.text }]}>
                        {selectedVersion.model}
                      </Text>
                    </View>
                    <View style={styles.configItem}>
                      <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Temperatura</Text>
                      <Text style={[styles.configValue, { color: colors.text }]}>
                        {selectedVersion.temperature}
                      </Text>
                    </View>
                    <View style={styles.configItem}>
                      <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Max Tokens</Text>
                      <Text style={[styles.configValue, { color: colors.text }]}>
                        {selectedVersion.max_tokens}
                      </Text>
                    </View>
                  </View>

                  <Button
                    title="Restaurar Esta Versao"
                    onPress={() => handleRollback(selectedVersion)}
                    loading={rolling}
                    style={styles.rollbackButton}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 40 },
  versionCard: { marginBottom: 10, paddingVertical: 12 },
  versionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  versionLabel: { fontSize: 16, fontWeight: '600' },
  versionDate: { fontSize: 12, marginTop: 2 },
  versionMeta: { flexDirection: 'row', gap: 12 },
  metaValue: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, marginTop: 16, textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopWidth: 1, borderRadius: 12, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalScroll: { padding: 20 },

  diffSection: { marginBottom: 20 },
  diffLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  diffCard: { padding: 12, borderRadius: 8 },
  diffValue: { fontSize: 13, lineHeight: 18 },

  configGrid: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  configItem: { flex: 1, minWidth: 120 },
  configLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  configValue: { fontSize: 16, fontWeight: '500' },

  rollbackButton: { marginBottom: 20 },
});
