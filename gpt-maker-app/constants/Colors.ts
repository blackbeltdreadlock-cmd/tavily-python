const brand = {
  primary: '#3c9ffe',
  primaryDark: '#0274df',
  accent: '#6c5ce7',
  success: '#00b894',
  warning: '#fdcb6e',
  danger: '#e74c3c',
};

export default {
  brand,
  light: {
    text: '#1a1a2e',
    textSecondary: '#636e72',
    background: '#ffffff',
    backgroundSecondary: '#f8f9fa',
    card: '#ffffff',
    border: '#e9ecef',
    tint: brand.primary,
    tabIconDefault: '#b2bec3',
    tabIconSelected: brand.primary,
    inputBackground: '#f1f3f5',
    placeholder: '#adb5bd',
  },
  dark: {
    text: '#f8f9fa',
    textSecondary: '#adb5bd',
    background: '#0a0a1a',
    backgroundSecondary: '#141428',
    card: '#1a1a2e',
    border: '#2d2d44',
    tint: brand.primary,
    tabIconDefault: '#636e72',
    tabIconSelected: brand.primary,
    inputBackground: '#1a1a2e',
    placeholder: '#636e72',
  },
} as const;

export type ThemeColors = typeof import('./Colors').default.light;
