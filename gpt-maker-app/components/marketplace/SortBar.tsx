import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColor';
import Colors from '@/constants/Colors';
import type { MarketplaceSort } from '@/types';

const OPTIONS: { key: MarketplaceSort; label: string }[] = [
  { key: 'popular', label: 'Populares' },
  { key: 'recent', label: 'Recentes' },
  { key: 'rating', label: 'Melhor avaliados' },
];

interface SortBarProps {
  value: MarketplaceSort;
  onChange: (sort: MarketplaceSort) => void;
}

export function SortBar({ value, onChange }: SortBarProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? Colors.brand.primary : colors.inputBackground,
                borderColor: active ? Colors.brand.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[styles.label, { color: active ? '#fff' : colors.textSecondary }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
