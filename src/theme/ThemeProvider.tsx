import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/settings';
import { palettes, type Palette, type ThemeMode } from './colors';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: Palette;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'theme';

// Must be rendered inside <SQLiteProvider>. New users default to Light;
// the choice is saved in the settings table.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    getSetting(db, THEME_KEY).then((saved) => {
      if (active && (saved === 'light' || saved === 'dark')) setModeState(saved);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      void setSetting(db, THEME_KEY, next);
    },
    [db],
  );

  const value = useMemo(
    () => ({ mode, colors: palettes[mode], setMode }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
