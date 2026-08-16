import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEFAULT_BOT_CONFIG, AI_MODELS, BOT_CATEGORIES } from '@/lib/constants';
import Colors from '@/constants/Colors';

type Step = 'basics' | 'personality' | 'config' | 'review';

export default function CreateBotScreen() {
  const colors = useThemeColors();
  const { createBot } = useBotStore();
  const [step, setStep] = useState<Step>('basics');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_BOT_CONFIG.system_prompt);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_BOT_CONFIG.welcome_message);
  const [model, setModel] = useState(DEFAULT_BOT_CONFIG.model);
  const [category, setCategory] = useState('');

  const steps: Step[] = ['basics', 'personality', 'config', 'review'];
  const stepIndex = steps.indexOf(step);

  const canNext = () => {
    if (step === 'basics') return name.trim().length > 0;
    if (step === 'personality') return systemPrompt.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStep(steps[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1]);
    } else {
      router.back();
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const bot = await createBot({
        name: name.trim(),
        description: description.trim() || null,
        system_prompt: systemPrompt.trim(),
        welcome_message: welcomeMessage.trim() || null,
        model,
        temperature: DEFAULT_BOT_CONFIG.temperature,
        max_tokens: DEFAULT_BOT_CONFIG.max_tokens,
        category: category || null,
        tags: [],
      });
      Alert.alert('Bot criado!', `${bot.name} esta pronto para conversar.`, [
        { text: 'Conversar', onPress: () => router.replace(`/bot/${bot.id}/chat` as any) },
        { text: 'Ver detalhes', onPress: () => router.replace(`/bot/${bot.id}` as any) },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Criar Bot',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[styles.progressDot, i <= stepIndex && { backgroundColor: Colors.brand.primary }]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'basics' && (
            <>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Informacoes Basicas</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                De um nome e descricao ao seu bot
              </Text>
              <Input
                label="Nome do Bot"
                placeholder="Ex: Assistente de Vendas"
                value={name}
                onChangeText={setName}
                maxLength={60}
              />
              <Input
                label="Descricao (opcional)"
                placeholder="O que seu bot faz?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {BOT_CATEGORIES.map((cat) => (
                  <Card
                    key={cat.slug}
                    onPress={() => setCategory(cat.slug)}
                    style={{
                      ...styles.categoryChip,
                      ...(category === cat.slug ? { borderColor: Colors.brand.primary, borderWidth: 2 } : {}),
                    }}
                  >
                    <Text style={[styles.categoryText, { color: colors.text }]}>{cat.name}</Text>
                  </Card>
                ))}
              </View>
            </>
          )}

          {step === 'personality' && (
            <>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Personalidade</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Defina como seu bot deve se comportar
              </Text>
              <Input
                label="Instrucoes do Sistema (System Prompt)"
                placeholder="Voce e um assistente especializado em..."
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                multiline
                numberOfLines={8}
                style={{ height: 180, textAlignVertical: 'top' }}
              />
              <Input
                label="Mensagem de Boas-vindas"
                placeholder="Ola! Como posso ajudar?"
                value={welcomeMessage}
                onChangeText={setWelcomeMessage}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
            </>
          )}

          {step === 'config' && (
            <>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Configuracao</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Escolha o modelo de IA
              </Text>
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
            </>
          )}

          {step === 'review' && (
            <>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Revisar</Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                Confira as informacoes do seu bot
              </Text>
              <Card style={styles.reviewCard}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Nome</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{name}</Text>

                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Descricao</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {description || 'Sem descricao'}
                </Text>

                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Modelo</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {AI_MODELS.find((m) => m.id === model)?.name}
                </Text>

                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>System Prompt</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]} numberOfLines={4}>
                  {systemPrompt}
                </Text>
              </Card>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button title="Voltar" onPress={handleBack} variant="ghost" />
          {step === 'review' ? (
            <Button title="Criar Bot" onPress={handleCreate} loading={loading} />
          ) : (
            <Button title="Proximo" onPress={handleNext} disabled={!canNext()} />
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2d2d44',
  },
  content: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  stepDesc: { fontSize: 15, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 16 },
  categoryText: { fontSize: 14, fontWeight: '500' },
  modelCard: { marginBottom: 10 },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modelName: { fontSize: 16, fontWeight: '600' },
  modelDesc: { fontSize: 13 },
  reviewCard: { gap: 8 },
  reviewLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 8 },
  reviewValue: { fontSize: 16 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
});
