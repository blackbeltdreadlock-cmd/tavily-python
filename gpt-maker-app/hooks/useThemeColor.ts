import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

type Theme = 'light' | 'dark';

export function useThemeColor(
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
  props?: { light?: string; dark?: string },
) {
  const scheme: Theme = (useColorScheme() as Theme) ?? 'dark';
  const colorFromProps = props?.[scheme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[scheme][colorName];
}

export function useThemeColors() {
  const scheme: Theme = (useColorScheme() as Theme) ?? 'dark';
  return Colors[scheme];
}
