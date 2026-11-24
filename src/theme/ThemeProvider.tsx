import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { palettes, type Palette, type ThemeMode } from './colors';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// New users default to Light. The choice is persisted once the
// settings table exists (see build plan, step 2).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const value = useMemo(
    () => ({ mode, colors: palettes[mode], setMode }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
