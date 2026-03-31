import {
  Text,
  StyleSheet,
  FlatList,
  View,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { colors, fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useBoardsStore } from '../../../stores/boards-store'
import { fetchUserBoards, type Board } from '../../../lib/github'
import { fetchGithubPAT } from '../../../lib/github-pat'
import { getCached, setCached } from '../../../lib/cache'
import { getLastBoardId, getLastViewedAt } from '../../../lib/last-board'

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
  hasUnread: boolean
  theme: ReturnType<typeof useTheme>['theme']
  onPress: () => void
}

function BoardCard({ board, hasUnread, theme, onPress }: BoardCardProps) {
  const s = useMemo(() => cardStyles(theme), [theme])
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open board ${board.title}${hasUnread ? ', has recent updates' : ''}`}
    >
      <Card style={s.card}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={2}>
              {board.title}
            </Text>
            {hasUnread && (
              <View
                style={s.unreadDot}
                accessibilityLabel="Recent updates"
                accessibilityRole="image"
              />
            )}
          </View>
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
    </Pressable>
  )
}

function cardStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[3] },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[3],
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    title: {
      flex: 1,
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      flexShrink: 0,
    },
    description: {
      marginTop: spacing[1],
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
    },
    updatedAt: {
      marginTop: spacing[2],
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
    },
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
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[3],
    },
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
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { boards, isLoading, error, setBoards, setLoading, setError } = useBoardsStore()
  const s = useMemo(() => styles(theme, insets.bottom), [theme, insets.bottom])
  const didRedirect = useRef(false)

  const loadBoards = useCallback(async () => {
    if (!user?.id) return

    const cached = await getCached<Board[]>(['boards', user.id])
    if (cached) {
      setBoards(cached)
    }

    setLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }
      const result = await fetchUserBoards(pat)
      await setCached(['boards', user.id], result)
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

  // On first render, redirect to the last-viewed board if one is saved
  useEffect(() => {
    if (!user?.id || didRedirect.current) return
    void (async () => {
      const lastId = await getLastBoardId(user.id)
      if (lastId) {
        didRedirect.current = true
        router.push({ pathname: '/(app)/board/[id]', params: { id: lastId } })
      }
    })()
  }, [user?.id, router])

  const onRefresh = useCallback(() => {
    void loadBoards()
  }, [loadBoards])

  const navigateToBoard = useCallback(
    (boardId: string) => {
      router.push({ pathname: '/(app)/board/[id]', params: { id: boardId } })
    },
    [router]
  )

  // Compute unread state per board based on last-viewed timestamps
  const [unreadBoardIds, setUnreadBoardIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!user?.id) return
    void (async () => {
      const ids = new Set<string>()
      for (const board of boards) {
        const lastViewed = await getLastViewedAt(user.id, board.id)
        if (lastViewed === null) continue // Never viewed — not "unread", just new
        const boardUpdatedAt = new Date(board.updatedAt).getTime()
        if (boardUpdatedAt > lastViewed) {
          ids.add(board.id)
        }
      }
      setUnreadBoardIds(ids)
    })()
  }, [boards, user?.id])

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
      renderItem={({ item }) => (
        <BoardCard
          board={item}
          hasUnread={unreadBoardIds.has(item.id)}
          theme={theme}
          onPress={() => navigateToBoard(item.id)}
        />
      )}
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

function styles(theme: ReturnType<typeof useTheme>['theme'], bottomInset: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    content: { padding: spacing[5], paddingBottom: bottomInset + spacing[5] },
    centered: { justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
    emptyContainer: { flex: 1, padding: spacing[5] },
    emptyInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing[3],
    },
    emptyTitle: {
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    emptyBody: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    errorTitle: {
      marginTop: spacing[4],
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    errorBody: {
      marginTop: spacing[2],
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: spacing[6],
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: 12,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    retryLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: colors.surface.background,
    },
  })
}
