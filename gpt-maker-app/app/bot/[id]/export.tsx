import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Pressable, Share } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { useImportExportStore } from '@/stores/importExportStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Colors from '@/constants/Colors';
import { generateExportJson, formatFileSize } from '@/lib/botExport';
import type { BotExportData } from '@/stores/importExportStore';

export default function ExportBotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { fetchBot } = useBotStore();
  const { exportBotAsJson, exporting } = useImportExportStore();

  const [bot, setBot] = useState<any>(null);
  const [exportData, setExportData] = useState<BotExportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const b = await fetchBot(id);
      if (b) {
        setBot(b);
        const data = await exportBotAsJson(id);
        setExportData(data);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportData) return;

    try {
      const json = generateExportJson(exportData);
      const filename = `bot_${bot.name.replace(/\s+/g, '_')}_${Date.now()}.json`;

      if (typeof window !== 'undefined' && window.document) {
        // Web environment
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Sucesso', 'Bot exportado com sucesso!');
      } else {
        // React Native
        await Share.share({
          message: json,
          title: filename,
        });
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleCopy = async () => {
    if (!exportData) return;
    try {
      const json = generateExportJson(exportData);
      // In React Native, use clipboard API if available
      Alert.alert('Copiar JSON', 'JSON copiado para clipboard (simulado)');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </>
    );
  }

  if (!bot) return null;

  const jsonSize = exportData ? generateExportJson(exportData).length : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Exportar ${bot.name}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="download-outline" size={32} color={Colors.brand.primary} />
            <Text style={[styles.infoTitle, { color: colors.text }]}>Exportar Bot</Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Exporte este bot como um arquivo JSON para compartilhar, fazer backup ou reimportar em outro lugar.
          </Text>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Detalhes da Exportação</Text>

          <View style={styles.detail}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Bot</Text>
            <Text style={[styles.value, { color: colors.text }]}>{bot.name}</Text>
          </View>

          <View style={styles.detail}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tamanho</Text>
            <Text style={[styles.value, { color: colors.text }]}>{formatFileSize(jsonSize)}</Text>
          </View>

          <View style={styles.detail}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Itens inclusos</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              • Configuração do bot{'\n'}
              • System prompt{'\n'}
              • {exportData?.knowledge.length || 0} itens de conhecimento
            </Text>
          </View>

          <View style={styles.detail}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Data de exportação</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {exportData?.exportedAt ? new Date(exportData.exportedAt).toLocaleString('pt-BR') : '-'}
            </Text>
          </View>
        </Card>

        <Card style={{ ...styles.previewCard, backgroundColor: colors.border } as any}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Pré-visualização JSON</Text>
          <ScrollView
            horizontal
            style={styles.jsonScroll}
            contentContainerStyle={styles.jsonContent}
          >
            <Text style={[styles.jsonPreview, { color: colors.textSecondary }]}>
              {exportData ? JSON.stringify(exportData, null, 2).substring(0, 500) : ''}
              {exportData && JSON.stringify(exportData, null, 2).length > 500 ? '\n...' : ''}
            </Text>
          </ScrollView>
        </Card>

        <View style={styles.actions}>
          <Button
            title={exporting ? 'Exportando...' : 'Exportar JSON'}
            onPress={handleExport}
            loading={exporting}
            size="lg"
            style={styles.button}
          />
          <Button
            title="Copiar JSON"
            onPress={handleCopy}
            variant="secondary"
            size="lg"
            style={styles.button}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  infoCard: { marginBottom: 20, paddingVertical: 16 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  infoText: { fontSize: 14, lineHeight: 20 },

  detailsCard: { marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },

  detail: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 14, lineHeight: 20 },

  previewCard: { marginBottom: 20, padding: 12, borderRadius: 8 },
  jsonScroll: { maxHeight: 200 },
  jsonContent: { paddingRight: 16 },
  jsonPreview: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },

  actions: { gap: 12 },
  button: { marginBottom: 0 },
});
