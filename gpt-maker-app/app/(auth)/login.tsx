import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColor';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuthStore();
  const colors = useThemeColors();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Erro ao entrar', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#3c9ffe', '#0274df']}
              style={styles.logo}
            >
              <Text style={styles.logoText}>GM</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>GPT Maker</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Crie seus chatbots com IA
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          <Button title="Entrar" onPress={handleLogin} loading={loading} size="lg" />

          <View style={styles.links}>
            <Link href="/(auth)/register" style={[styles.link, { color: colors.tint }]}>
              Criar conta
            </Link>
            <Link href="/(auth)/forgot-password" style={[styles.link, { color: colors.textSecondary }]}>
              Esqueci minha senha
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { marginBottom: 16 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 16 },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  links: { alignItems: 'center', marginTop: 24, gap: 12 },
  link: { fontSize: 15, fontWeight: '500' },
});
