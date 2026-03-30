import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import Markdown from 'react-native-markdown-display'
import Ionicons from '@expo/vector-icons/Ionicons'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { fetchGithubPAT } from '../../../lib/github-pat'
import { fetchTaskDetail, type TaskDetail, type TaskAssignee, type TaskLabel } from '../../../lib/github'
import { useTasksStore } from '../../../stores/tasks-store'
import { Avatar } from '../../../components/ui/Avatar'

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
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={statusBadgeStyles.badge}>
      <Text style={statusBadgeStyles.label}>{status}</Text>
    </View>
  )
}

const statusBadgeStyles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.brand.primary + '26',
  },
  label: {
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    fontWeight: '600',
    color: colors.brand.primary,
  },
})

// ---------------------------------------------------------------------------
// Assignees row
// ---------------------------------------------------------------------------

function AssigneesRow({ assignees }: { assignees: TaskAssignee[] }) {
  return (
    <View style={assigneesRowStyles.row}>
      {assignees.map((assignee, index) => (
        <View
          key={assignee.login}
          style={[assigneesRowStyles.avatarWrap, index > 0 && assigneesRowStyles.overlap]}
        >
          <Avatar uri={assignee.avatarUrl} name={assignee.login} size="sm" />
        </View>
      ))}
      <Text style={assigneesRowStyles.logins}>
        {assignees.map((a) => a.login).join(', ')}
      </Text>
    </View>
  )
}

const assigneesRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] },
  avatarWrap: {},
  overlap: { marginLeft: -8 },
  logins: {
    fontSize: fontSize.sm.size,
    lineHeight: fontSize.sm.lineHeight,
    color: colors.neutral[600],
    marginLeft: spacing[1],
  },
})

// ---------------------------------------------------------------------------
// Metadata row (priority / due date)
// ---------------------------------------------------------------------------

interface MetaItemProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  theme: ReturnType<typeof useTheme>['theme']
}

function MetaItem({ icon, label, value, theme }: MetaItemProps) {
  const s = useMemo(() => metaItemStyles(theme), [theme])
  return (
    <View style={s.container}>
      <Ionicons name={icon} size={14} color={theme.colors.mutedForeground} />
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  )
}

function metaItemStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    label: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
    },
    value: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
  })
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TaskDetailScreen() {
  const { id, boardId } = useLocalSearchParams<{ id: string; boardId?: string }>()
  const { theme } = useTheme()
  const user = useCurrentUser()
  const router = useRouter()
  const navigation = useNavigation()

  const tasksByBoard = useTasksStore((state) => state.tasksByBoard)

  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Try to bootstrap from store first (avoids a network call if board was already loaded)
  const cachedTask = useMemo(() => {
    if (!id || !boardId) return null
    return tasksByBoard[boardId]?.find((t) => t.id === id) ?? null
  }, [id, boardId, tasksByBoard])

  const loadDetail = useCallback(async () => {
    if (!id || !user?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }
      const result = await fetchTaskDetail(pat, id)
      setDetail(result)
      navigation.setOptions({ title: result.title })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('401') || message.toLowerCase().includes('expired')) {
        setError('Your GitHub token has expired. Please relink your account.')
      } else if (message.toLowerCase().includes('not found')) {
        setError('This task could not be found.')
      } else {
        setError(`Failed to load task: ${message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [id, user?.id, navigation])

  useEffect(() => {
    // Set initial title from store cache while we fetch full detail
    if (cachedTask) {
      navigation.setOptions({ title: cachedTask.title })
    }
    void loadDetail()
  }, [cachedTask, loadDetail, navigation])

  const s = useMemo(() => styles(theme), [theme])
  const markdownStyles = useMemo(() => buildMarkdownStyles(theme), [theme])

  if (isLoading && !detail) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (error && !detail) {
    return (
      <View style={[s.container, s.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={s.errorTitle}>Something went wrong</Text>
        <Text style={s.errorBody}>{error}</Text>
        <Pressable
          style={s.actionButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={s.actionButtonLabel}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  if (!detail) return null

  const formattedDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
    >
      {/* Title */}
      <Text style={s.title}>{detail.title}</Text>

      {/* Status + draft badge */}
      <View style={s.badgeRow}>
        {detail.status != null && <StatusBadge status={detail.status} />}
        {detail.isDraft && (
          <View style={s.draftBadge}>
            <Text style={s.draftLabel}>Draft</Text>
          </View>
        )}
      </View>

      {/* Labels */}
      {detail.labels.length > 0 && (
        <View style={s.labelsRow}>
          {detail.labels.map((label: TaskLabel) => (
            <LabelChip key={label.name} name={label.name} color={label.color} />
          ))}
        </View>
      )}

      {/* Assignees */}
      {detail.assignees.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Assignees</Text>
          <AssigneesRow assignees={detail.assignees} />
        </View>
      )}

      {/* Issue link */}
      {!detail.isDraft && detail.issueUrl != null && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Linked issue</Text>
          <Pressable
            onPress={() => {
              if (detail.issueUrl) {
                void Linking.openURL(detail.issueUrl)
              }
            }}
            accessibilityRole="link"
            accessibilityLabel={`Open issue #${detail.issueNumber ?? ''} on GitHub`}
            style={s.issueLink}
          >
            <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
            <Text style={s.issueLinkText}>
              #{detail.issueNumber} · {detail.issueState ?? 'OPEN'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Metadata grid (priority + due date) */}
      {(detail.priority != null || detail.dueDate != null) && (
        <View style={s.metaGrid}>
          {detail.priority != null && (
            <MetaItem
              icon="flag-outline"
              label="Priority"
              value={detail.priority}
              theme={theme}
            />
          )}
          {detail.dueDate != null && (
            <MetaItem
              icon="calendar-outline"
              label="Due"
              value={formattedDate(detail.dueDate)}
              theme={theme}
            />
          )}
        </View>
      )}

      {/* Dates */}
      <View style={s.metaGrid}>
        <MetaItem
          icon="time-outline"
          label="Created"
          value={formattedDate(detail.createdAt)}
          theme={theme}
        />
        <MetaItem
          icon="pencil-outline"
          label="Updated"
          value={formattedDate(detail.updatedAt)}
          theme={theme}
        />
      </View>

      {/* Body (markdown) */}
      {detail.body != null && detail.body.trim().length > 0 && (
        <View style={s.bodySection}>
          <Text style={s.sectionLabel}>Description</Text>
          <Markdown style={markdownStyles}>{detail.body}</Markdown>
        </View>
      )}
    </ScrollView>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: spacing[5],
      paddingBottom: spacing[10],
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[8],
    },
    title: {
      fontSize: fontSize['2xl'].size,
      lineHeight: fontSize['2xl'].lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: spacing[3],
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginBottom: spacing[3],
    },
    draftBadge: {
      alignSelf: 'flex-start',
      borderRadius: 99,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      backgroundColor: theme.colors.muted,
    },
    draftLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
    },
    labelsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginBottom: spacing[4],
    },
    section: {
      marginBottom: spacing[4],
      gap: spacing[2],
    },
    sectionLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing[1],
    },
    issueLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
    },
    issueLinkText: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[4],
      marginBottom: spacing[4],
    },
    bodySection: {
      marginTop: spacing[2],
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
    actionButton: {
      marginTop: spacing[6],
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[6],
      borderRadius: borderRadius['xl'],
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: colors.surface.background,
    },
  })
}

function buildMarkdownStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    body: {
      color: theme.colors.foreground,
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
    },
    heading1: {
      fontSize: fontSize['2xl'].size,
      lineHeight: fontSize['2xl'].lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: spacing[4],
      marginBottom: spacing[2],
    },
    heading2: {
      fontSize: fontSize.xl.size,
      lineHeight: fontSize.xl.lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: spacing[4],
      marginBottom: spacing[2],
    },
    heading3: {
      fontSize: fontSize.lg.size,
      lineHeight: fontSize.lg.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginTop: spacing[3],
      marginBottom: spacing[1],
    },
    code_inline: {
      backgroundColor: theme.colors.muted,
      color: theme.colors.foreground,
      borderRadius: 4,
      paddingHorizontal: spacing[1],
      fontFamily: 'monospace',
    } as const,
    fence: {
      backgroundColor: theme.colors.muted,
      borderRadius: 6,
      padding: spacing[3],
      marginVertical: spacing[2],
    },
    code_block: {
      backgroundColor: theme.colors.muted,
      borderRadius: 6,
      padding: spacing[3],
      fontFamily: 'monospace',
      color: theme.colors.foreground,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingLeft: spacing[3],
      marginVertical: spacing[2],
      opacity: 0.8,
    },
    bullet_list: { marginVertical: spacing[2] },
    ordered_list: { marginVertical: spacing[2] },
    list_item: { marginBottom: spacing[1] },
    paragraph: { marginBottom: spacing[3] },
    link: { color: theme.colors.primary },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
  })
}
