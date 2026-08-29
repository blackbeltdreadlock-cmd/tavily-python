import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeColors } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { useImportExportStore } from '@/stores/importExportStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Colors from '@/constants/Colors';
import { validateImportJson, formatFileSize } from '@/lib/botExport';
import type { BotExportData } from '@/stores/importExportStore';

export default function ImportBotScreen() {
  const colors = useThemeColors();
  const [userId, setUserId] = useState<string | null>(null);
  const { importBotFromJson, importing } = useImportExportStore();

  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [jsonData, setJsonData] = useState<BotExportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState('');

  useFocusEffect(() => {
    loadUser();
  });

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);

        // Read file content
        const response = await fetch(file.uri);
        const text = await response.text();

        // Validate JSON
        const validation = validateImportJson(text);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return;
        }

        const data = JSON.parse(text) as BotExportData;
        setJsonData(data);
        setCustomName(data.bot.name);
        setStep('preview');
        setErrors([]);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao ler arquivo: ' + error.message);
    }
  };

  const handleImport = async () => {
    if (!userId || !jsonData) return;

    setLoading(true);
    try {
      const newBot = await importBotFromJson(
        { ...jsonData, bot: { ...jsonData.bot, name: customName } },
        userId
      );

      Alert.alert('Sucesso', 'Bot importado com sucesso!');
      router.replace(`/bot/${newBot.id}`);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedFile(null);
    setJsonData(null);
    setErrors([]);
    setCustomName('');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Importar Bot',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {step === 'select' && (
          <>
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="arrow-up-circle-outline" size={32} color={Colors.brand.primary} />
                <Text style={[styles.infoTitle, { color: colors.text }]}>Importar Bot</Text>
              </View>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Selecione um arquivo JSON exportado de outro bot para importar sua configuração, sistema de prompt e conhecimento.
              </Text>
            </Card>

            <Card style={styles.requirementsCard}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Requisitos</Text>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.primary} />
                <Text style={[styles.requirementText, { color: colors.text }]}>Arquivo JSON válido</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.primary} />
                <Text style={[styles.requirementText, { color: colors.text }]}>Máximo 50 MB</Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.brand.primary} />
                <Text style={[styles.requirementText, { color: colors.text }]}>Campos obrigatórios: nome, system_prompt, model</Text>
              </View>
            </Card>

            <Button
              title="Selecionar Arquivo JSON"
              onPress={handleSelectFile}
              size="lg"
              style={styles.button}
            />
          </>
        )}

        {step === 'preview' && jsonData && (
          <>
            <Card style={styles.detailsCard}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Pré-visualização</Text>

              <View style={styles.detail}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Arquivo</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
                </Text>
              </View>

              <View style={styles.detail}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Nome do Bot</Text>
                <Input
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Nome do bot"
                  maxLength={60}
                />
              </View>

              <View style={styles.detail}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Modelo</Text>
                <Text style={[styles.value, { color: colors.text }]}>{jsonData.bot.model}</Text>
              </View>

              <View style={styles.detail}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Temperatura</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {(jsonData.bot.temperature || 0.7).toFixed(2)}
                </Text>
              </View>

              <View style={styles.detail}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Conhecimento</Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {jsonData.knowledge.length} itens
                </Text>
              </View>

              {errors.length > 0 && (
                <View style={[styles.errorBox, { borderColor: '#ff4444' }]}>
                  {errors.map((error, i) => (
                    <Text key={i} style={[styles.errorText, { color: '#ff4444' }]}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}
            </Card>

            <View style={styles.actions}>
              <Button
                title="Cancelar"
                onPress={handleBack}
                variant="secondary"
                size="lg"
                style={styles.button}
              />
              <Button
                title="Importar Bot"
                onPress={() => setStep('confirm')}
                size="lg"
                style={styles.button}
              />
            </View>
          </>
        )}

        {step === 'confirm' && jsonData && (
          <>
            <Card style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Ionicons name="checkmark-circle-outline" size={64} color={Colors.brand.primary} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Tem certeza?</Text>
              <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
                Você está prestes a importar "{customName}" como um novo bot privado. Você pode editá-lo depois.
              </Text>
            </Card>

            <View style={styles.actions}>
              <Button
                title="Voltar"
                onPress={() => setStep('preview')}
                variant="secondary"
                size="lg"
                style={styles.button}
                disabled={importing}
              />
              <Button
                title={importing ? 'Importando...' : 'Confirmar Import'}
                onPress={handleImport}
                loading={importing}
                size="lg"
                style={styles.button}
              />
            </View>
          </>
        )}
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

  requirementsCard: { marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requirementText: { fontSize: 14, flex: 1 },

  detailsCard: { marginBottom: 20 },
  detail: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  value: { fontSize: 14 },

  confirmCard: { marginBottom: 20, alignItems: 'center', paddingVertical: 32 },
  confirmIcon: { marginBottom: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  confirmText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  actions: { gap: 12 },
  button: { marginBottom: 0 },

  errorBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: 'rgba(255, 68, 68, 0.1)' },
  errorText: { fontSize: 12, lineHeight: 16, marginBottom: 4 },
});
