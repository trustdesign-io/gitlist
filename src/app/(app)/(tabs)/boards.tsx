import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'

export default function BoardsScreen() {
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  return (
    <View style={s.container}>
      <Text style={s.title}>Boards</Text>
      <Text style={s.body}>Your GitHub repo boards will appear here.</Text>
    </View>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.muted,
      padding: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    body: {
      fontSize: 16,
      color: theme.colors.mutedForeground,
    },
  })
}
