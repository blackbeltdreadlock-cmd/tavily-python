import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useBotStore } from '@/stores/botStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BOT_CATEGORIES } from '@/lib/constants';
import { botShareUrl } from '@/lib/share';
import Colors from '@/constants/Colors';
import type { Bot } from '@/types';

export default function PublishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { fetchBot } = useBotStore();
  const { publishBot, unpublishBot } = useMarketplaceStore();

  const [bot, setBot] = useState<Bot | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBot(id).then((b) => {
        if (b) {
          setBot(b);
          setCategory(b.category);
        }
      });
    }
  }, [id]);

  const reload = async () => {
    if (id) setBot(await fetchBot(id));
  };

  const handlePublish = async () => {
    if (!id) return;
    if (!category) {
      Alert.alert('Escolha uma categoria', 'A categoria ajuda as pessoas a encontrarem seu bot.');
      return;
    }
    setBusy(true);
    try {
      await publishBot(id, category);
      await reload();
      Alert.alert(
        'Publicado!',
        'Seu bot ja aparece no marketplace. Qualquer pessoa pode conversar com ele.',
      );
    } catch (error: any) {
      Alert.alert('Erro ao publicar', error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = () => {
    if (!id) return;
    Alert.alert(
      'Despublicar',
      'O bot sai do marketplace. Quem ja adquiriu continua com acesso, e as avaliacoes sao apagadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Despublicar',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await unpublishBot(id);
              await reload();
            } catch (error: any) {
              Alert.alert('Erro', error.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!bot) return;
    await Share.share({
      message: `Conheca "${bot.name}" no GPT Maker: ${botShareUrl(bot.id)}`,
    });
  };

  if (!bot) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Publicar',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={bot.is_published ? 'checkmark-circle' : 'ellipse-outline'}
              size={26}
              color={bot.is_published ? Colors.brand.success : colors.textSecondary}
            />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {bot.is_published ? 'Publicado no marketplace' : 'Ainda nao publicado'}
              </Text>
              <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                {bot.is_published
                  ? 'Visivel para todos na busca e nas categorias'
                  : 'So voce consegue ver e usar este bot'}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categoria</Text>
        <View style={styles.categoryGrid}>
          {BOT_CATEGORIES.map((cat) => (
            <Card
              key={cat.slug}
              onPress={() => setCategory(cat.slug)}
              style={{
                ...styles.categoryChip,
                ...(category === cat.slug
                  ? { borderColor: Colors.brand.primary, borderWidth: 2 }
                  : {}),
              }}
            >
              <Text style={[styles.categoryText, { color: colors.text }]}>{cat.name}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.noticeCard}>
          <Text style={[styles.noticeTitle, { color: colors.text }]}>Antes de publicar</Text>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Publicar torna o bot e a resposta dele visiveis para qualquer pessoa. Nao inclua dados
            pessoais ou confidenciais no system prompt nem na base de conhecimento.
          </Text>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Os bots sao gratuitos por enquanto — a cobranca ainda nao esta disponivel.
          </Text>
        </Card>

        {bot.is_published ? (
          <>
            <Button title="Compartilhar bot" onPress={handleShare} size="lg" />
            <Button
              title="Despublicar"
              onPress={handleUnpublish}
              variant="outline"
              loading={busy}
              style={{ marginTop: 12 }}
            />
          </>
        ) : (
          <Button
            title="Publicar no marketplace"
            onPress={handlePublish}
            loading={busy}
            size="lg"
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  statusCard: { marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '600' },
  statusSub: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 16 },
  categoryText: { fontSize: 14, fontWeight: '500' },
  noticeCard: { marginBottom: 24, gap: 8 },
  noticeTitle: { fontSize: 15, fontWeight: '600' },
  noticeText: { fontSize: 13, lineHeight: 19 },
});
