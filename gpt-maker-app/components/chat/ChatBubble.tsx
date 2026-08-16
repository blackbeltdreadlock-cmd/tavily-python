import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColor';
import Colors from '@/constants/Colors';

interface ChatBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp?: string;
}

export function ChatBubble({ content, role, timestamp }: ChatBubbleProps) {
  const colors = useThemeColors();
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? styles.userBubble
            : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text style={[styles.content, { color: isUser ? '#fff' : colors.text }]}>
          {content}
        </Text>
      </View>
      {timestamp && (
        <Text style={[styles.timestamp, { color: colors.textSecondary }, isUser && styles.userTimestamp]}>
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12, paddingHorizontal: 16, maxWidth: '85%' },
  userContainer: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16 },
  userBubble: {
    backgroundColor: Colors.brand.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  content: { fontSize: 16, lineHeight: 22 },
  timestamp: { fontSize: 11, marginTop: 4 },
  userTimestamp: { textAlign: 'right' },
});
