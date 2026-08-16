import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeColors } from '@/hooks/useThemeColor';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isSupportedTextFile, SUPPORTED_FILE_LABEL } from '@/lib/knowledge';
import Colors from '@/constants/Colors';
import type { BotKnowledge } from '@/types';

export default function KnowledgeScreen() {
  const { id: botId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { documents, loading, uploading, fetchKnowledge, addTextKnowledge, addFileKnowledge, deleteKnowledge } =
    useKnowledgeStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (botId) fetchKnowledge(botId);
  }, [botId]);

  const handleAddText = async () => {
    if (!botId || !title.trim() || !content.trim()) {
      Alert.alert('Erro', 'Preencha titulo e conteudo.');
      return;
    }
    try {
      await addTextKnowledge(botId, title.trim(), content.trim());
      setTitle('');
      setContent('');
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Erro ao adicionar', error.message);
    }
  };

  const handlePickFile = async () => {
    if (!botId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    const file = result.assets[0];
    if (!isSupportedTextFile(file.name)) {
      Alert.alert(
        'Formato nao suportado',
        `Por enquanto aceitamos ${SUPPORTED_FILE_LABEL}. PDF ainda nao e suportado.`,
      );
      return;
    }

    try {
      await addFileKnowledge(botId, {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
      });
    } catch (error: any) {
      Alert.alert('Erro ao enviar arquivo', error.message);
    }
  };

  const handleDelete = (doc: BotKnowledge) => {
    Alert.alert('Remover documento', `Remover "${doc.title}" da base de conhecimento?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteKnowledge(doc.id);
          } catch (error: any) {
            Alert.alert('Erro', error.message);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Base de Conhecimento',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => botId && fetchKnowledge(botId)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.actions}>
              <Button
                title="Adicionar texto"
                onPress={() => setModalVisible(true)}
                style={{ flex: 1 }}
              />
              <Button
                title="Enviar arquivo"
                onPress={handlePickFile}
                variant="outline"
                loading={uploading}
                style={{ flex: 1 }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.docCard}>
              <View style={styles.docRow}>
                <Ionicons
                  name={item.content_type === 'file' ? 'document-text' : 'create'}
                  size={22}
                  color={Colors.brand.primary}
                />
                <View style={styles.docInfo}>
                  <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                    {item.chunk_count} {item.chunk_count === 1 ? 'trecho' : 'trechos'}
                    {item.status !== 'ready' ? ` · ${item.status}` : ''}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(item)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="library-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Base vazia</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Adicione documentos para o bot responder com base neles
                </Text>
              </View>
            ) : null
          }
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar texto</Text>
              <Input label="Titulo" placeholder="Ex: Politica de trocas" value={title} onChangeText={setTitle} />
              <Input
                label="Conteudo"
                placeholder="Cole aqui o texto que o bot deve conhecer..."
                value={content}
                onChangeText={setContent}
                multiline
                style={{ height: 200, textAlignVertical: 'top' }}
              />
              <View style={styles.modalActions}>
                <Button title="Cancelar" onPress={() => setModalVisible(false)} variant="ghost" />
                <Button title="Adicionar" onPress={handleAddText} loading={uploading} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  docCard: { marginBottom: 10 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 16, fontWeight: '600' },
  docMeta: { fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 15, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
