import { Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useState, useCallback, useMemo } from 'react'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { Card } from '../../../components/ui/Card'
import { fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'

export default function HomeScreen() {
  const user = useCurrentUser()
  const { theme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }, [])
  const s = useMemo(() => styles(theme), [theme])

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <Text style={s.greeting}>Hello{user?.name ? `, ${user.name}` : ''}</Text>
      <Text style={s.subtitle}>Your GitHub repositories, organised</Text>
      <Card>
        <Text style={s.cardTitle}>Connect GitHub</Text>
        <Text style={s.cardBody}>
          Link your GitHub account to start tracking issues and pull requests across your repos.
        </Text>
      </Card>
    </ScrollView>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    content: { padding: spacing[6] },
    greeting: { fontSize: fontSize['2xl'].size, lineHeight: fontSize['2xl'].lineHeight, fontWeight: '700', color: theme.colors.foreground, marginBottom: spacing[1] },
    subtitle: { fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, color: theme.colors.mutedForeground, marginBottom: spacing[6] },
    cardTitle: { fontSize: fontSize.lg.size, lineHeight: fontSize.lg.lineHeight, fontWeight: '600', color: theme.colors.foreground, marginBottom: spacing[2] },
    cardBody: { fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, color: theme.colors.mutedForeground },
  })
}
