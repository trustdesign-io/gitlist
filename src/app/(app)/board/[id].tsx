import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useCallback, useEffect, useMemo } from 'react'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { fetchGithubPAT } from '../../../lib/github-pat'
import { fetchBoardItems, groupTasksByStatus, type BoardColumn, type Task } from '../../../lib/github'
import { useTasksStore } from '../../../stores/tasks-store'
import { getCached, setCached } from '../../../lib/cache'
import { useBoardsStore } from '../../../stores/boards-store'
import { Avatar } from '../../../components/ui/Avatar'
import { Card } from '../../../components/ui/Card'

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonTaskCard({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const s = useMemo(() => skeletonStyles(theme), [theme])
  return (
    <Card style={s.card}>
      <View style={s.titleRow}>
        <View style={[s.shimmer, s.titleBlock]} />
        <View style={[s.shimmer, s.numberBlock]} />
      </View>
      <View style={s.row}>
        <View style={[s.shimmer, s.labelChip]} />
        <View style={[s.shimmer, s.labelChip]} />
      </View>
    </Card>
  )
}

function skeletonStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[2] },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
    row: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
    shimmer: { backgroundColor: theme.colors.muted, borderRadius: 6 },
    titleBlock: { flex: 1, height: 16 },
    numberBlock: { width: 48, height: 14 },
    labelChip: { width: 60, height: 20, borderRadius: 99 },
  })
}

function SkeletonSection({ theme }: { theme: ReturnType<typeof useTheme>['theme'] }) {
  const s = useMemo(() => skeletonSectionStyles(theme), [theme])
  return (
    <View style={s.section}>
      <View style={[s.shimmer, s.header]} />
      <SkeletonTaskCard theme={theme} />
      <SkeletonTaskCard theme={theme} />
      <SkeletonTaskCard theme={theme} />
    </View>
  )
}

function skeletonSectionStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    section: { marginBottom: spacing[6] },
    shimmer: { backgroundColor: theme.colors.muted, borderRadius: 6 },
    header: { height: 20, width: '40%', marginBottom: spacing[3] },
  })
}

// ---------------------------------------------------------------------------
// Label chip
// ---------------------------------------------------------------------------

function LabelChip({ name, color: hexColor }: { name: string; color: string }) {
  const bg = `#${hexColor}26`
  const text = `#${hexColor}`
  return (
    <View style={[labelChipStyles.chip, { backgroundColor: bg }]}>
      <Text style={[labelChipStyles.label, { color: text }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  )
}

const labelChipStyles = StyleSheet.create({
  chip: {
    borderRadius: 99,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    fontWeight: '600',
  },
})

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------

interface TaskCardProps {
  task: Task
  theme: ReturnType<typeof useTheme>['theme']
  onPress: () => void
}

function TaskCard({ task, theme, onPress }: TaskCardProps) {
  const s = useMemo(() => taskCardStyles(theme), [theme])
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={task.title}
    >
      <Card style={s.card}>
        <View style={s.topRow}>
          <Text style={s.title} numberOfLines={2}>
            {task.title}
          </Text>
          {task.issueNumber != null && (
            <Text style={s.issueNumber}>#{task.issueNumber}</Text>
          )}
        </View>

        {task.labels.length > 0 && (
          <View style={s.labels}>
            {task.labels.map((label) => (
              <LabelChip key={label.name} name={label.name} color={label.color} />
            ))}
          </View>
        )}

        {task.assignees.length > 0 && (
          <View style={s.assignees}>
            {task.assignees.map((assignee, index) => (
              <Avatar
                key={assignee.login}
                uri={assignee.avatarUrl}
                name={assignee.login}
                size="sm"
                style={[s.avatar, index > 0 && s.avatarOverlap]}
              />
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  )
}

function taskCardStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    card: { marginBottom: spacing[2] },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[2],
    },
    title: {
      flex: 1,
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    issueNumber: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
      paddingTop: 2,
    },
    labels: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[1],
      marginTop: spacing[2],
    },
    assignees: {
      flexDirection: 'row',
      marginTop: spacing[2],
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarOverlap: {
      marginLeft: -8,
    },
  })
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  count,
  theme,
}: {
  title: string
  count: number
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const s = useMemo(() => sectionHeaderStyles(theme), [theme])
  return (
    <View style={s.container}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.count}>{count}</Text>
    </View>
  )
}

function sectionHeaderStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[5],
      backgroundColor: theme.colors.muted,
    },
    title: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    count: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
      backgroundColor: theme.colors.card,
      paddingHorizontal: spacing[2],
      paddingVertical: 1,
      borderRadius: 99,
      overflow: 'hidden',
    },
  })
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useTheme()
  const user = useCurrentUser()
  const router = useRouter()
  const navigation = useNavigation()

  const { tasksByBoard, isLoading, error, setTasks, setLoading, setError } = useTasksStore()
  const boards = useBoardsStore((state) => state.boards)

  const tasks = id ? (tasksByBoard[id] ?? null) : null
  const board = id ? boards.find((b) => b.id === id) : undefined

  // Set the header title to the board name
  useEffect(() => {
    if (board?.title) {
      navigation.setOptions({ title: board.title })
    }
  }, [board?.title, navigation])

  const loadTasks = useCallback(async () => {
    if (!id || !user?.id) return

    // Serve cached data immediately so the screen renders without a spinner
    const cached = getCached<Task[]>(['tasks', user.id, id])
    if (cached) {
      setTasks(id, cached)
    }

    setLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }
      const result = await fetchBoardItems(pat, id)
      setCached(['tasks', user.id, id], result)
      setTasks(id, result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('401') || message.toLowerCase().includes('expired')) {
        setError('Your GitHub token has expired. Please relink your account.')
      } else if (message.includes('403') || message.toLowerCase().includes('rate limit')) {
        setError('GitHub API rate limit reached. Please wait a moment and try again.')
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError(`Failed to load tasks: ${message}`)
      }
    }
  }, [id, user?.id, setTasks, setLoading, setError])

  // Always fetch on mount — cached data is served immediately inside loadTasks,
  // then fresh data from the API replaces it when the request completes.
  useEffect(() => {
    void loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  const onRefresh = useCallback(() => {
    void loadTasks()
  }, [loadTasks])

  const { theme: t } = useTheme()
  const s = useMemo(() => styles(t), [t])

  const columns: BoardColumn[] = useMemo(
    () => (tasks ? groupTasksByStatus(tasks) : []),
    [tasks]
  )

  const sections = useMemo(
    () => columns.map((col) => ({ title: col.name, data: col.tasks, count: col.tasks.length })),
    [columns]
  )

  // Loading skeleton
  if (isLoading && tasks === null) {
    return (
      <View style={s.container}>
        <SkeletonSection theme={theme} />
        <SkeletonSection theme={theme} />
        <SkeletonSection theme={theme} />
      </View>
    )
  }

  // Error state
  if (error && tasks === null) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={s.errorTitle}>Something went wrong</Text>
        <Text style={s.errorBody}>{error}</Text>
        <Pressable
          style={s.retryButton}
          onPress={onRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading tasks"
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

  // Empty state
  if (tasks !== null && tasks.length === 0) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={s.emptyTitle}>No items yet</Text>
        <Text style={s.emptyBody}>
          Add issues or draft items to this board in GitHub and they'll appear here.
        </Text>
      </View>
    )
  }

  return (
    <SectionList
      style={s.container}
      contentContainerStyle={s.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <SectionHeader title={section.title} count={section.count} theme={theme} />
      )}
      renderItem={({ item }) => (
        <View style={s.taskPadding}>
          <TaskCard
            task={item}
            theme={theme}
            onPress={() =>
              router.push({
                pathname: '/(app)/task/[id]',
                params: { id: item.id, boardId: id },
              })
            }
          />
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
        />
      }
      stickySectionHeadersEnabled
    />
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    content: { paddingBottom: spacing[8] },
    taskPadding: { paddingHorizontal: spacing[5], paddingTop: spacing[2] },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[8],
    },
    emptyTitle: {
      marginTop: spacing[4],
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    emptyBody: {
      marginTop: spacing[2],
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
      borderRadius: borderRadius['xl'],
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
