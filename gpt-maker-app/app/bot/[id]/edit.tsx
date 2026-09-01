import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { useVersionStore } from '@/stores/versionStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AI_MODELS } from '@/lib/constants';
import Colors from '@/constants/Colors';
import type { Bot } from '@/types';

const MIN_TOKENS = 256;
const MAX_TOKENS = 8192;

export default function EditBotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { fetchBot, updateBot } = useBotStore();
  const { createVersion } = useVersionStore();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  useEffect(() => {
    if (id) {
      fetchBot(id).then((b) => {
        if (b) {
          setBot(b);
          setName(b.name);
          setDescription(b.description ?? '');
          setSystemPrompt(b.system_prompt);
          setWelcomeMessage(b.welcome_message ?? '');
          setModel(b.model);
          setTemperature(Number(b.temperature));
          setMaxTokens(b.max_tokens);
        }
      });
    }
  }, [id]);

  const handleSave = async () => {
    if (!id || !name.trim() || !systemPrompt.trim()) {
      Alert.alert('Erro', 'Nome e System Prompt sao obrigatorios');
      return;
    }
    setLoading(true);
    try {
      await updateBot(id, {
        name: name.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt.trim(),
        welcome_message: welcomeMessage.trim() || null,
        model,
        temperature,
        max_tokens: maxTokens,
      });
      await createVersion(id);
      Alert.alert('Salvo!', 'Bot atualizado com sucesso.');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!bot) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Editar ${bot.name}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/bot/${id}/versions`)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="time-outline" size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Input label="Nome" value={name} onChangeText={setName} maxLength={60} />
        <Input
          label="Descricao"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ height: 80, textAlignVertical: 'top' }}
        />
        <Input
          label="System Prompt"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          multiline
          style={{ height: 180, textAlignVertical: 'top' }}
        />
        <Input
          label="Mensagem de Boas-vindas"
          value={welcomeMessage}
          onChangeText={setWelcomeMessage}
          multiline
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuracao avancada</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Modelo</Text>
        {AI_MODELS.map((m) => (
          <Card
            key={m.id}
            onPress={() => setModel(m.id)}
            style={{
              ...styles.modelCard,
              ...(model === m.id ? { borderColor: Colors.brand.primary, borderWidth: 2 } : {}),
            }}
          >
            <View style={styles.modelRow}>
              <Ionicons
                name={model === m.id ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={model === m.id ? Colors.brand.primary : colors.textSecondary}
              />
              <View>
                <Text style={[styles.modelName, { color: colors.text }]}>{m.name}</Text>
                <Text style={[styles.modelDesc, { color: colors.textSecondary }]}>
                  {m.description}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Temperatura</Text>
            <Text style={[styles.sliderValue, { color: colors.text }]}>
              {temperature.toFixed(2)}
            </Text>
          </View>
          <Slider
            value={temperature}
            onValueChange={setTemperature}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            minimumTrackTintColor={Colors.brand.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={Colors.brand.primary}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Baixa deixa as respostas previsiveis e consistentes. Alta deixa mais criativas e variadas.
          </Text>
        </View>

        <View style={styles.sliderBlock}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Limite de tokens</Text>
            <Text style={[styles.sliderValue, { color: colors.text }]}>{maxTokens}</Text>
          </View>
          <Slider
            value={maxTokens}
            onValueChange={(v) => setMaxTokens(Math.round(v))}
            minimumValue={MIN_TOKENS}
            maximumValue={MAX_TOKENS}
            step={256}
            minimumTrackTintColor={Colors.brand.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={Colors.brand.primary}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Tamanho maximo de cada resposta. Um quarto desse limite fica reservado para a base de
            conhecimento.
          </Text>
        </View>

        <Button title="Salvar Alteracoes" onPress={handleSave} loading={loading} size="lg" />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  modelCard: { marginBottom: 10 },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modelName: { fontSize: 16, fontWeight: '600' },
  modelDesc: { fontSize: 13 },
  sliderBlock: { marginTop: 20, marginBottom: 8 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});
