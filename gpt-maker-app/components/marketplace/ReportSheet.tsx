import { useState } from 'react';
import { View, Text, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColor';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Colors from '@/constants/Colors';

const REASONS = [
  'Conteudo ofensivo',
  'Spam ou enganoso',
  'Viola direitos autorais',
  'Conteudo sexual ou violento',
  'Outro',
];

interface ReportSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string, details?: string) => Promise<void>;
}

export function ReportSheet({ visible, title, onClose, onSubmit }: ReportSheetProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, details.trim() || undefined);
      setReason('');
      setDetails('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {REASONS.map((option) => (
            <Card
              key={option}
              onPress={() => setReason(option)}
              style={{
                ...styles.option,
                ...(reason === option
                  ? { borderColor: Colors.brand.primary, borderWidth: 2 }
                  : {}),
              }}
            >
              <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
            </Card>
          ))}

          <Input
            label="Detalhes (opcional)"
            placeholder="Conte o que aconteceu"
            value={details}
            onChangeText={setDetails}
            multiline
            style={{ height: 70, textAlignVertical: 'top' }}
          />

          <View style={styles.actions}>
            <Button title="Cancelar" onPress={onClose} variant="ghost" />
            <Button
              title="Enviar denuncia"
              onPress={handleSubmit}
              disabled={!reason}
              loading={submitting}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  option: { paddingVertical: 12 },
  optionText: { fontSize: 15, fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
});
