import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  value: number;
  size?: number;
  /** Omit to render read-only. */
  onChange?: (rating: number) => void;
}

const STAR_COLOR = '#fdcb6e';

export function RatingStars({ value, size = 16, onChange }: RatingStarsProps) {
  const editable = !!onChange;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        // Read-only mode shows half stars so a 3.5 average doesn't round away.
        const name = editable
          ? n <= value
            ? 'star'
            : 'star-outline'
          : value >= n
            ? 'star'
            : value >= n - 0.5
              ? 'star-half'
              : 'star-outline';

        const star = <Ionicons name={name} size={size} color={STAR_COLOR} />;

        if (!editable) return <View key={n}>{star}</View>;

        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
