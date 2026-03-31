import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { fetchGithubPAT } from '../../../lib/github-pat'
import { fetchBoardItems, fetchUserBoards, type Task } from '../../../lib/github'
import { getCached, setCached } from '../../../lib/cache'
import { useBoardsStore } from '../../../stores/boards-store'
import { Card } from '../../../components/ui/Card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DUE_DATE_FIELD_NAMES = new Set(['due date', 'due', 'deadline'])

function isToday(isoOrYmd: string): boolean {
  // Parse YYYY-MM-DD by splitting the string to avoid UTC-vs-local mismatch.
  // new Date("2026-03-31") is midnight UTC, so .getDate() returns the wrong
  // day for users in UTC- timezones (e.g. US, Canada).
  const parts = isoOrYmd.split('-')
  if (parts.length < 3) return false
  const [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false
  const today = new Date()
  return (
    y === today.getFullYear() &&
    m - 1 === today.getMonth() &&
    d === today.getDate()
  )
}

function isDueToday(task: Task): boolean {
  return task.fieldValues.some(
    (fv) => DUE_DATE_FIELD_NAMES.has(fv.fieldName.toLowerCase()) && isToday(fv.value)
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const s = useMemo(() => skeletonStyles(theme), [theme])
  return (
    <Card style={s.card}>
      <View style={[s.shimmer, s.title]} />
      <View style={s.row}>
        <View style={[s.shimmer, s.chip]} />
        <View style={[s.shimmer, s.chip]} />
      </View>
    </Card>
  )
}

function skeletonStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[2] },
    shimmer: { backgroundColor: theme.colors.muted, borderRadius: 6 },
    title: { height: 16, width: '80%' },
    row: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
    chip: { width: 60, height: 20, borderRadius: 99 },
  })
}

function SkeletonSection({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const s = useMemo(() => skeletonSectionStyles(theme), [theme])
  return (
    <View style={s.wrap}>
      <View style={[s.shimmer, s.header]} />
      <SkeletonCard theme={theme} />
      <SkeletonCard theme={theme} />
    </View>
  )
}

function skeletonSectionStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing[5] },
    shimmer: { backgroundColor: theme.colors.muted, borderRadius: 6 },
    header: { height: 14, width: '35%', marginBottom: spacing[3] },
  })
}

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------

interface TodayTaskCardProps {
  task: Task
  theme: ReturnType<typeof useTheme>['theme']
  onPress: () => void
}

function TodayTaskCard({ task, theme, onPress }: TodayTaskCardProps) {
  const s = useMemo(() => taskCardStyles(theme), [theme])
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open task: ${task.title}${task.issueNumber != null ? `, issue #${task.issueNumber}` : ''}${task.status != null ? `, status: ${task.status}` : ''}`}
    >
      <Card style={s.card}>
        <View style={s.row}>
          <Text style={s.title} numberOfLines={2}>
            {task.title}
          </Text>
          {task.issueNumber != null && (
            <Text style={s.number}>#{task.issueNumber}</Text>
          )}
        </View>
        {task.status != null && (
          <View style={s.statusBadge}>
            <Text style={s.statusLabel}>{task.status}</Text>
          </View>
        )}
      </Card>
    </Pressable>
  )
}

function taskCardStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[2] },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[2],
    },
    title: {
      flex: 1,
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    number: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
      flexShrink: 0,
    },
    statusBadge: {
      marginTop: spacing[2],
      alignSelf: 'flex-start',
      borderRadius: 99,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
      backgroundColor: colors.brand.primary + '1a',
    },
    statusLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '600',
      color: colors.brand.primary,
    },
  })
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

interface BoardSection {
  title: string
  boardId: string
  taskIds: string
  data: Task[]
}

export default function TodayScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const user = useCurrentUser()

  const setBoards = useBoardsStore((state) => state.setBoards)

  const [sections, setSections] = useState<BoardSection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const s = useMemo(() => styles(theme, insets.bottom), [theme, insets.bottom])

  const loadToday = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }

      // Read boards from store state directly to avoid adding the reactive
      // `boards` array to the dependency list (would cause an infinite re-fetch
      // loop: setBoards → new boards ref → loadToday recreated → useEffect fires).
      let boardList = useBoardsStore.getState().boards
      if (boardList.length === 0) {
        const cached = await getCached<typeof boardList>(['boards', user.id])
        if (cached) {
          setBoards(cached)
          boardList = cached
        } else {
          const fetched = await fetchUserBoards(pat)
          await setCached(['boards', user.id], fetched)
          setBoards(fetched)
          boardList = fetched
        }
      }

      // Fetch tasks for each board (use cache if fresh)
      const nextSections: BoardSection[] = []
      await Promise.all(
        boardList.map(async (board) => {
          let tasks = await getCached<Task[]>(['tasks', user.id, board.id])
          if (!tasks) {
            tasks = await fetchBoardItems(pat, board.id)
            await setCached(['tasks', user.id, board.id], tasks)
          }
          const todayTasks = tasks.filter(isDueToday)
          if (todayTasks.length > 0) {
            nextSections.push({
              title: board.title,
              boardId: board.id,
              taskIds: todayTasks.map((t) => t.id).join(','),
              data: todayTasks,
            })
          }
        })
      )

      // Sort sections by board title for stable ordering
      nextSections.sort((a, b) => a.title.localeCompare(b.title))
      setSections(nextSections)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('401') || message.toLowerCase().includes('expired')) {
        setError('Your GitHub token has expired. Please relink your account.')
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError(`Failed to load tasks: ${message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, setBoards])

  useEffect(() => {
    void loadToday()
  }, [loadToday])

  const onRefresh = useCallback(() => {
    void loadToday()
  }, [loadToday])

  if (isLoading && sections.length === 0) {
    return (
      <View style={s.container}>
        <SkeletonSection theme={theme} />
        <SkeletonSection theme={theme} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={s.errorTitle}>Something went wrong</Text>
        <Text style={s.errorBody}>{error}</Text>
        <Pressable
          style={s.retryButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry"
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

  if (sections.length === 0) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="checkmark-circle-outline" size={56} color={theme.colors.mutedForeground} />
        <Text style={s.emptyTitle}>All clear for today</Text>
        <Text style={s.emptyBody}>No tasks are due today across your boards.</Text>
        <Pressable
          style={s.refreshButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
          <Text style={s.refreshLabel}>Refresh</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <SectionList
      style={s.list}
      contentContainerStyle={s.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <Text style={s.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item, section }) => (
        <TodayTaskCard
          task={item}
          theme={theme}
          onPress={() =>
            router.push({
              pathname: '/(app)/task/[id]',
              params: {
                id: item.id,
                boardId: (section as BoardSection).boardId,
                taskIds: (section as BoardSection).taskIds,
              },
            })
          }
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
      stickySectionHeadersEnabled={false}
    />
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme'], bottomInset: number) {
  return StyleSheet.create({
    list: { flex: 1, backgroundColor: theme.colors.muted },
    container: { flex: 1, backgroundColor: theme.colors.muted, padding: spacing[5] },
    content: { padding: spacing[5], paddingBottom: bottomInset + spacing[5] },
    centered: { justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
    sectionHeader: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing[2],
      marginTop: spacing[4],
    },
    emptyTitle: {
      marginTop: spacing[4],
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    emptyBody: {
      marginTop: spacing[2],
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    refreshButton: {
      marginTop: spacing[5],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
    },
    refreshLabel: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.primary,
      fontWeight: '600',
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
      borderRadius: borderRadius.xl,
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
