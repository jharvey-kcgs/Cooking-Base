export type ThemeMode = 'light' | 'dark';

export type Palette = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
};

export const palettes: Record<ThemeMode, Palette> = {
  light: {
    background: '#FFF8F0',
    surface: '#FFFFFF',
    text: '#2B211B',
    textMuted: '#7A6A5F',
    primary: '#D9622B',
    onPrimary: '#FFFFFF',
    border: '#EADBCB',
  },
  dark: {
    background: '#1A1512',
    surface: '#26201C',
    text: '#F5EBE0',
    textMuted: '#B3A395',
    primary: '#F08A57',
    onPrimary: '#1A1512',
    border: '#3A302A',
  },
};
