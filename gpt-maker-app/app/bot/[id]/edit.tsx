import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Bot } from '@/types';

export default function EditBotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { fetchBot, updateBot } = useBotStore();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchBot(id).then((b) => {
        if (b) {
          setBot(b);
          setName(b.name);
          setDescription(b.description ?? '');
          setSystemPrompt(b.system_prompt);
          setWelcomeMessage(b.welcome_message ?? '');
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
      });
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
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
        <Input
          label="System Prompt"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          multiline
          numberOfLines={8}
          style={{ height: 180, textAlignVertical: 'top' }}
        />
        <Input
          label="Mensagem de Boas-vindas"
          value={welcomeMessage}
          onChangeText={setWelcomeMessage}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
        <Button title="Salvar Alteracoes" onPress={handleSave} loading={loading} size="lg" />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
});
