import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { type ColorScheme, type Theme, lightTheme, darkTheme } from '../lib/theme'

const STORAGE_KEY = '@theme_preference'

interface ThemeContextValue {
  theme: Theme
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  colorScheme: 'system',
  setColorScheme: async () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setColorSchemeState(stored)
        }
      })
      .catch(() => {}) // ignore storage errors, fall back to system
  }, [])

  async function setColorScheme(scheme: ColorScheme) {
    setColorSchemeState(scheme)
    try {
      await AsyncStorage.setItem(STORAGE_KEY, scheme)
    } catch {
      // ignore storage errors
    }
  }

  const resolvedDark =
    colorScheme === 'system' ? systemScheme === 'dark' : colorScheme === 'dark'
  const theme = resolvedDark ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
