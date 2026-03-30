import {
  Text,
  StyleSheet,
  FlatList,
  View,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useCallback, useEffect, useMemo } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { colors, fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useBoardsStore } from '../../../stores/boards-store'
import { fetchUserBoards, type Board } from '../../../lib/github'
import { fetchGithubPAT } from '../../../lib/github-pat'

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface BoardCardProps {
  board: Board
  theme: ReturnType<typeof useTheme>['theme']
}

function BoardCard({ board, theme }: BoardCardProps) {
  const s = useMemo(() => cardStyles(theme), [theme])
  return (
    <Card style={s.card}>
      <View style={s.header}>
        <Text style={s.title} numberOfLines={2}>
          {board.title}
        </Text>
        <Badge
          label={`${board.itemCount} item${board.itemCount !== 1 ? 's' : ''}`}
          variant="secondary"
        />
      </View>
      {board.shortDescription ? (
        <Text style={s.description} numberOfLines={2}>
          {board.shortDescription}
        </Text>
      ) : null}
      <Text style={s.updatedAt}>Updated {formatUpdatedAt(board.updatedAt)}</Text>
    </Card>
  )
}

function cardStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[3] },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[3] },
    title: { flex: 1, fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, fontWeight: '600', color: theme.colors.foreground },
    description: { marginTop: spacing[1], fontSize: fontSize.sm.size, lineHeight: fontSize.sm.lineHeight, color: theme.colors.mutedForeground },
    updatedAt: { marginTop: spacing[2], fontSize: fontSize.xs.size, lineHeight: fontSize.xs.lineHeight, color: theme.colors.mutedForeground },
  })
}

function SkeletonCard({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const s = useMemo(() => skeletonStyles(theme), [theme])
  return (
    <Card style={s.card}>
      <View style={s.titleRow}>
        <View style={[s.shimmer, s.titleBlock]} />
        <View style={[s.shimmer, s.badgeBlock]} />
      </View>
      <View style={[s.shimmer, s.descBlock]} />
      <View style={[s.shimmer, s.dateBlock]} />
    </Card>
  )
}

function skeletonStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[3] },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
    shimmer: { backgroundColor: theme.colors.muted, borderRadius: 6 },
    titleBlock: { flex: 1, height: 18 },
    badgeBlock: { width: 64, height: 22, borderRadius: 99 },
    descBlock: { marginTop: spacing[2], height: 14, width: '70%' },
    dateBlock: { marginTop: spacing[2], height: 12, width: '30%' },
  })
}

export default function BoardsScreen() {
  const user = useCurrentUser()
  const { theme } = useTheme()
  const { boards, isLoading, error, setBoards, setLoading, setError } = useBoardsStore()
  const s = useMemo(() => styles(theme), [theme])

  const loadBoards = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }
      const result = await fetchUserBoards(pat)
      setBoards(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('401') || message.toLowerCase().includes('expired')) {
        setError('Your GitHub token has expired. Please relink your account.')
      } else if (message.includes('403') || message.toLowerCase().includes('rate limit')) {
        setError('GitHub API rate limit reached. Please wait a moment and try again.')
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError(`Failed to load boards: ${message}`)
      }
    }
  }, [user?.id, setBoards, setLoading, setError])

  useEffect(() => {
    void loadBoards()
  }, [loadBoards])

  const onRefresh = useCallback(() => {
    void loadBoards()
  }, [loadBoards])

  if (isLoading && boards.length === 0) {
    return (
      <FlatList
        style={s.container}
        contentContainerStyle={s.content}
        data={[1, 2, 3, 4]}
        keyExtractor={(item) => String(item)}
        renderItem={() => <SkeletonCard theme={theme} />}
        scrollEnabled={false}
      />
    )
  }

  if (error && boards.length === 0) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={s.errorTitle}>Something went wrong</Text>
        <Text style={s.errorBody}>{error}</Text>
        <Pressable
          style={s.retryButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading boards"
        >
          {isLoading ? (
            <ActivityIndicator color={colors.surface.background} size="small" />
          ) : (
            <Text style={s.retryLabel}>Try again</Text>
          )}
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      style={s.container}
      contentContainerStyle={boards.length === 0 ? s.emptyContainer : s.content}
      data={boards}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <BoardCard board={item} theme={theme} />}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={s.emptyInner}>
          <Ionicons name="albums-outline" size={48} color={theme.colors.mutedForeground} />
          <Text style={s.emptyTitle}>No boards yet</Text>
          <Text style={s.emptyBody}>
            Create a GitHub Projects v2 board and it will appear here.
          </Text>
        </View>
      }
    />
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    content: { padding: spacing[5] },
    centered: { justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
    emptyContainer: { flex: 1, padding: spacing[5] },
    emptyInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing[3] },
    emptyTitle: { fontSize: fontSize.lg.size, lineHeight: fontSize.lg.lineHeight, fontWeight: '600', color: theme.colors.foreground },
    emptyBody: { fontSize: fontSize.sm.size, lineHeight: fontSize.sm.lineHeight, color: theme.colors.mutedForeground, textAlign: 'center' },
    errorTitle: { marginTop: spacing[4], fontSize: fontSize.lg.size, lineHeight: fontSize.lg.lineHeight, fontWeight: '600', color: theme.colors.foreground },
    errorBody: { marginTop: spacing[2], fontSize: fontSize.sm.size, lineHeight: fontSize.sm.lineHeight, color: theme.colors.mutedForeground, textAlign: 'center' },
    retryButton: { marginTop: spacing[6], backgroundColor: theme.colors.primary, paddingVertical: spacing[3], paddingHorizontal: spacing[6], borderRadius: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    retryLabel: { fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, fontWeight: '600', color: colors.surface.background },
  })
}
