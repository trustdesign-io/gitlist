import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { fetchGithubPAT } from '../../../lib/github-pat'
import {
  fetchBoardItems,
  groupTasksByStatus,
  addDraftTask,
  fetchStatusField,
  findDoneOption,
  setTaskStatus,
  removeTaskFromBoard,
  type BoardColumn,
  type Task,
  type StatusField,
} from '../../../lib/github'
import { fetchBoardFields } from '../../../lib/board-fields'
import { useTasksStore } from '../../../stores/tasks-store'
import { useFieldsStore } from '../../../stores/fields-store'
import { getCached, setCached } from '../../../lib/cache'
import { useBoardsStore } from '../../../stores/boards-store'
import { setLastBoardId, setLastViewedAt } from '../../../lib/last-board'
import {
  getPersistedFilters,
  setPersistedFilters,
  type FilterKey,
  type ActiveFilters,
} from '../../../lib/task-filters'
import { Avatar } from '../../../components/ui/Avatar'
import { Card } from '../../../components/ui/Card'
import { captureEvent } from '../../../lib/analytics'
import { EntitlementGate } from '../../../components/EntitlementGate'

const ALL_BOARDS_ID = 'all'
const MAX_ITEMS_PER_BOARD = 50
// Height of the search + filter header — used to scroll past it on initial render
const SEARCH_HEADER_HEIGHT = 116

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
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[3],
    },
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
  isCompleting?: boolean
  onPress: () => void
}

const PRIORITY_FIELD_NAMES = ['priority', 'urgency']
const DUE_DATE_FIELD_NAMES = ['due date', 'due', 'deadline']

function formatDueDate(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return iso
  const now = new Date()
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays <= 7) return `${diffDays}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function TaskCard({ task, theme, isCompleting, onPress }: TaskCardProps) {
  const s = useMemo(() => taskCardStyles(theme), [theme])

  const priority = task.fieldValues.find((fv) =>
    PRIORITY_FIELD_NAMES.includes(fv.fieldName.toLowerCase())
  )
  const dueDate = task.fieldValues.find((fv) =>
    DUE_DATE_FIELD_NAMES.includes(fv.fieldName.toLowerCase())
  )
  // Compute overdue using the same day-difference approach as formatDueDate
  // to avoid timezone mismatches when comparing date-only strings to Date.now()
  const isOverdue =
    dueDate != null &&
    Math.round(
      (new Date(dueDate.value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ) < 0

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={task.title}
    >
      <Card style={[s.card, isCompleting && s.completingCard]}>
        <View style={s.topRow}>
          <Text
            style={[s.title, isCompleting && s.completingTitle]}
            numberOfLines={2}
          >
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

        {(priority != null || dueDate != null) && (
          <View style={s.fieldRow}>
            {priority != null && (
              <View
                style={[
                  s.priorityBadge,
                  priority.color
                    ? { backgroundColor: `#${priority.color.replace(/^#/, '')}26` }
                    : { backgroundColor: theme.colors.muted },
                ]}
              >
                <Text
                  style={[
                    s.priorityLabel,
                    {
                      color: priority.color
                        ? `#${priority.color.replace(/^#/, '')}`
                        : theme.colors.foreground,
                    },
                  ]}
                >
                  {priority.value}
                </Text>
              </View>
            )}
            {dueDate != null && (
              <View style={s.dueDateBadge}>
                <Ionicons
                  name="calendar-outline"
                  size={11}
                  color={isOverdue ? colors.semantic.error : theme.colors.mutedForeground}
                />
                <Text style={[s.dueDateLabel, isOverdue && s.dueDateLabelOverdue]}>
                  {formatDueDate(dueDate.value)}
                </Text>
              </View>
            )}
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
    completingCard: { opacity: 0.4 },
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
    completingTitle: {
      textDecorationLine: 'line-through',
      color: theme.colors.mutedForeground,
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
    fieldRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      marginTop: spacing[2],
      alignItems: 'center',
    },
    priorityBadge: {
      borderRadius: 99,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    priorityLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '600',
    },
    dueDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    dueDateLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      color: theme.colors.mutedForeground,
    },
    dueDateLabelOverdue: {
      color: colors.semantic.error,
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
// Swipe actions
// ---------------------------------------------------------------------------

function CompleteAction() {
  return (
    <View style={completeActionStyles.container}>
      <Ionicons name="checkmark" size={24} color="#fff" />
      <Text style={completeActionStyles.label}>Done</Text>
    </View>
  )
}

const completeActionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.semantic.success,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    paddingHorizontal: spacing[4],
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  label: {
    color: '#fff',
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    fontWeight: '700',
  },
})

function DeleteAction() {
  return (
    <View style={deleteActionStyles.container}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={deleteActionStyles.label}>Remove</Text>
    </View>
  )
}

const deleteActionStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    paddingHorizontal: spacing[4],
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  label: {
    color: '#fff',
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    fontWeight: '700',
  },
})

// ---------------------------------------------------------------------------
// Swipeable row
// ---------------------------------------------------------------------------

interface SwipeableRowProps {
  task: Task
  theme: ReturnType<typeof useTheme>['theme']
  canComplete: boolean
  isCompleting: boolean
  onPress: () => void
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

function SwipeableRow({
  task,
  theme,
  canComplete,
  isCompleting,
  onPress,
  onComplete,
  onDelete,
}: SwipeableRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null)

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      swipeableRef.current?.close()
      if (direction === 'left') {
        onComplete(task)
      } else {
        onDelete(task)
      }
    },
    [task, onComplete, onDelete]
  )

  return (
    <View style={rowStyles.padding}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderLeftActions={canComplete ? () => <CompleteAction /> : undefined}
        renderRightActions={() => <DeleteAction />}
        onSwipeableOpen={handleSwipeOpen}
        friction={2}
        leftThreshold={80}
        rightThreshold={80}
        overshootLeft={false}
        overshootRight={false}
      >
        <TaskCard task={task} theme={theme} isCompleting={isCompleting} onPress={onPress} />
      </ReanimatedSwipeable>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  padding: { paddingHorizontal: spacing[5], paddingTop: spacing[2] },
})

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
// Filter chip
// ---------------------------------------------------------------------------

interface FilterChipProps {
  label: string
  value: string | undefined
  onPress: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function FilterChip({ label, value, onPress, theme }: FilterChipProps) {
  const s = useMemo(() => filterChipStyles(theme), [theme])
  const active = value != null
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && s.activeChip]}
      accessibilityRole="button"
      accessibilityLabel={active ? `${label}: ${value}` : `Filter by ${label}`}
    >
      <Text style={[s.label, active && s.activeLabel]} numberOfLines={1}>
        {active ? value : label}
      </Text>
      <Ionicons
        name={active ? 'close-circle' : 'chevron-down'}
        size={13}
        color={active ? theme.colors.primary : theme.colors.mutedForeground}
      />
    </Pressable>
  )
}

function filterChipStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: 99,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    activeChip: {
      backgroundColor: theme.colors.primary + '18',
      borderColor: theme.colors.primary,
    },
    label: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      maxWidth: 100,
    },
    activeLabel: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  })
}

// ---------------------------------------------------------------------------
// Search + filter header
// ---------------------------------------------------------------------------

interface SearchFilterHeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  activeFilters: ActiveFilters
  availableStatuses: string[]
  availableAssignees: string[]
  availableLabels: string[]
  onFilterChipPress: (key: FilterKey) => void
  onClearAll: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function SearchFilterHeader({
  searchQuery,
  onSearchChange,
  activeFilters,
  availableStatuses,
  availableAssignees,
  availableLabels,
  onFilterChipPress,
  onClearAll,
  theme,
}: SearchFilterHeaderProps) {
  const s = useMemo(() => searchHeaderStyles(theme), [theme])
  const hasActiveFilters = Object.values(activeFilters).some((v) => v != null)

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={theme.colors.mutedForeground} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search tasks"
        />
      </View>

      <View style={s.filtersRow}>
        {availableStatuses.length > 0 && (
          <FilterChip
            label="Status"
            value={activeFilters.status}
            onPress={() => onFilterChipPress('status')}
            theme={theme}
          />
        )}
        {availableAssignees.length > 0 && (
          <FilterChip
            label="Assignee"
            value={activeFilters.assignee}
            onPress={() => onFilterChipPress('assignee')}
            theme={theme}
          />
        )}
        {availableLabels.length > 0 && (
          <FilterChip
            label="Label"
            value={activeFilters.label}
            onPress={() => onFilterChipPress('label')}
            theme={theme}
          />
        )}
        {hasActiveFilters && (
          <Pressable
            onPress={onClearAll}
            style={s.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Text style={s.clearLabel}>Clear all</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

function searchHeaderStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing[5],
      paddingTop: spacing[3],
      paddingBottom: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.muted,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[3],
      height: 40,
      marginBottom: spacing[2],
    },
    searchIcon: {
      marginRight: spacing[2],
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.sm.size,
      color: theme.colors.foreground,
      height: '100%',
    },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    clearButton: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      justifyContent: 'center',
    },
    clearLabel: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
    },
  })
}

// ---------------------------------------------------------------------------
// Quick-add bar
// ---------------------------------------------------------------------------

interface QuickAddBarProps {
  onSubmit: (title: string) => Promise<void>
  theme: ReturnType<typeof useTheme>['theme']
  bottomInset: number
}

function QuickAddBar({ onSubmit, theme, bottomInset }: QuickAddBarProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)
  const s = useMemo(() => quickAddStyles(theme, bottomInset), [theme, bottomInset])

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 3000)
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    const submitted = trimmed
    setTitle('')

    try {
      await onSubmit(submitted)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      inputRef.current?.focus()
    } catch {
      showError('Failed to add task. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, isSubmitting, onSubmit, showError])

  const canSubmit = title.trim().length > 0 && !isSubmitting

  return (
    <View style={s.wrapper}>
      {errorMsg != null && (
        <View style={s.errorBanner} accessibilityLiveRegion="polite">
          <Text style={s.errorText}>{errorMsg}</Text>
        </View>
      )}
      <View style={s.bar}>
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder="Add a task..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          blurOnSubmit={false}
          editable={!isSubmitting}
          accessibilityLabel="New task title"
        />
        <Pressable
          style={[s.sendButton, !canSubmit && s.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface.background} size="small" />
          ) : (
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSubmit ? colors.surface.background : theme.colors.mutedForeground}
            />
          )}
        </Pressable>
      </View>
    </View>
  )
}

function quickAddStyles(theme: ReturnType<typeof useTheme>['theme'], bottomInset: number) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[3] + bottomInset,
      gap: spacing[2],
    },
    input: {
      flex: 1,
      minHeight: 40,
      backgroundColor: theme.colors.input,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.muted,
    },
    errorBanner: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
    },
    errorText: {
      color: colors.surface.background,
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
    },
  })
}

// ---------------------------------------------------------------------------
// Board picker modal
// ---------------------------------------------------------------------------

interface BoardPickerModalProps {
  currentBoardId: string
  onSelect: (boardId: string) => void
  onClose: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

interface PickerBoardItem {
  id: string
  title: string
  itemCount?: number
  isAllBoards?: boolean
}

function BoardPickerModal({ currentBoardId, onSelect, onClose, theme }: BoardPickerModalProps) {
  const boards = useBoardsStore((state) => state.boards)
  const insets = useSafeAreaInsets()
  const s = useMemo(() => boardPickerStyles(theme), [theme])

  const items: PickerBoardItem[] = [
    { id: ALL_BOARDS_ID, title: 'All boards', isAllBoards: true },
    ...boards.map((b) => ({ id: b.id, title: b.title, itemCount: b.itemCount })),
  ]

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[s.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>Switch Board</Text>
          <Pressable
            onPress={onClose}
            style={s.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={s.closeLabel}>Cancel</Text>
          </Pressable>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = item.id === currentBoardId
            return (
              <Pressable
                style={[s.boardRow, isSelected && s.boardRowSelected]}
                onPress={() => onSelect(item.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={item.title}
              >
                {item.isAllBoards ? (
                  <Ionicons
                    name="albums-outline"
                    size={20}
                    color={isSelected ? theme.colors.primary : theme.colors.mutedForeground}
                    style={s.boardIcon}
                  />
                ) : (
                  <Ionicons
                    name="git-branch-outline"
                    size={20}
                    color={isSelected ? theme.colors.primary : theme.colors.mutedForeground}
                    style={s.boardIcon}
                  />
                )}
                <Text style={[s.boardName, isSelected && s.boardNameSelected]}>
                  {item.title}
                </Text>
                {item.itemCount != null && (
                  <Text style={s.boardCount}>{item.itemCount}</Text>
                )}
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                )}
              </Pressable>
            )
          }}
          style={s.list}
        />
      </View>
    </Modal>
  )
}

function boardPickerStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '60%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginTop: spacing[3],
      marginBottom: spacing[2],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing[5],
      paddingBottom: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    closeButton: { paddingVertical: spacing[1], paddingLeft: spacing[4] },
    closeLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.primary,
    },
    list: { flexGrow: 0 },
    boardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[5],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    boardRowSelected: {
      backgroundColor: theme.colors.primary + '0d',
    },
    boardIcon: { marginRight: spacing[3] },
    boardName: {
      flex: 1,
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
    },
    boardNameSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    boardCount: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      marginRight: spacing[2],
    },
  })
}

// ---------------------------------------------------------------------------
// Filter picker modal
// ---------------------------------------------------------------------------

interface FilterPickerModalProps {
  visible: boolean
  title: string
  options: string[]
  selected: string | undefined
  onSelect: (value: string) => void
  onDismiss: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function FilterPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onDismiss,
  theme,
}: FilterPickerModalProps) {
  const s = useMemo(() => filterPickerStyles(theme), [theme])
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <Pressable style={s.backdrop} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close filter" />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.option}
              onPress={() => onSelect(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected: item === selected }}
            >
              <Text style={[s.optionLabel, item === selected && s.selectedLabel]}>
                {item}
              </Text>
              {item === selected && (
                <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
        <Pressable
          style={s.cancelButton}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={s.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

function filterPickerStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: spacing[8],
      maxHeight: '60%',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      alignSelf: 'center',
      marginTop: spacing[3],
      marginBottom: spacing[2],
    },
    title: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      textAlign: 'center',
      paddingBottom: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
    },
    optionLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
    },
    selectedLabel: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: spacing[5],
    },
    cancelButton: {
      marginHorizontal: spacing[5],
      marginTop: spacing[3],
      paddingVertical: spacing[3],
      alignItems: 'center',
      backgroundColor: theme.colors.muted,
      borderRadius: borderRadius.lg,
    },
    cancelLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
  })
}

// ---------------------------------------------------------------------------
// Filter badge (nav header right button)
// ---------------------------------------------------------------------------

interface FilterBadgeButtonProps {
  activeCount: number
  onPress: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function FilterBadgeButton({ activeCount, onPress, theme }: FilterBadgeButtonProps) {
  const s = useMemo(() => filterBadgeStyles(theme), [theme])
  return (
    <Pressable
      onPress={onPress}
      style={s.container}
      accessibilityRole="button"
      accessibilityLabel={
        activeCount > 0 ? `Filters: ${activeCount} active` : 'Filter tasks'
      }
      hitSlop={8}
    >
      <Ionicons
        name="options-outline"
        size={22}
        color={activeCount > 0 ? theme.colors.primary : theme.colors.foreground}
      />
      {activeCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeLabel}>{activeCount}</Text>
        </View>
      )}
    </Pressable>
  )
}

function filterBadgeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    badgeLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.surface.background,
      lineHeight: 12,
    },
  })
}

// ---------------------------------------------------------------------------
// Undo toast
// ---------------------------------------------------------------------------

interface UndoToastProps {
  visible: boolean
  label: string
  onUndo: () => void
  theme: ReturnType<typeof useTheme>['theme']
  bottomOffset: number
}

function UndoToast({ visible, label, onUndo, theme, bottomOffset }: UndoToastProps) {
  const s = useMemo(() => undoToastStyles(theme, bottomOffset), [theme, bottomOffset])
  if (!visible) return null
  return (
    <View style={s.overlay} pointerEvents="box-none">
      <View style={s.toast}>
        <Text style={s.label} numberOfLines={1}>
          {label}
        </Text>
        <Pressable
          onPress={onUndo}
          style={s.undoButton}
          accessibilityRole="button"
          accessibilityLabel="Undo"
          hitSlop={8}
        >
          <Text style={s.undoLabel}>Undo</Text>
        </Pressable>
      </View>
    </View>
  )
}

function undoToastStyles(theme: ReturnType<typeof useTheme>['theme'], bottomOffset: number) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      bottom: bottomOffset,
      left: spacing[5],
      right: spacing[5],
      alignItems: 'center',
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.foreground,
      borderRadius: borderRadius['xl'],
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[4],
      gap: spacing[3],
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    label: {
      flex: 1,
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.background,
    },
    undoButton: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
    },
    undoLabel: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      fontWeight: '700',
      color: theme.colors.primary,
    },
  })
}

// ---------------------------------------------------------------------------
// Pending undo state
// ---------------------------------------------------------------------------

type PendingUndo =
  | {
      type: 'complete'
      task: Task
      boardId: string
      removeTimerId: ReturnType<typeof setTimeout>
      apiTimerId: ReturnType<typeof setTimeout>
      fieldId: string
      doneOptionId: string
    }
  | {
      type: 'delete'
      task: Task
      boardId: string
      apiTimerId: ReturnType<typeof setTimeout>
    }

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

function BoardScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { theme } = useTheme()
  const user = useCurrentUser()
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const [pickerVisible, setPickerVisible] = useState(false)
  const [statusField, setStatusFieldState] = useState<StatusField | null>(null)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [undoToastVisible, setUndoToastVisible] = useState(false)
  const [undoToastLabel, setUndoToastLabel] = useState('')
  const pendingUndo = useRef<PendingUndo | null>(null)

  // Search + filter state — restored from cache on mount
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [filterPickerKey, setFilterPickerKey] = useState<FilterKey | null>(null)

  const sectionListRef = useRef<SectionList<Task>>(null)

  const {
    tasksByBoard,
    isLoading,
    error,
    setTasks,
    setLoading,
    setError,
    prependTask,
    removeTask,
    replaceTask,
    insertTask,
  } = useTasksStore()
  const setFields = useFieldsStore((state) => state.setFields)
  const boards = useBoardsStore((state) => state.boards)

  const isAllBoards = id === ALL_BOARDS_ID
  const board = isAllBoards ? undefined : boards.find((b) => b.id === id)

  // Load persisted filters on mount
  useEffect(() => {
    if (!id || id === ALL_BOARDS_ID) return
    void (async () => {
      const saved = await getPersistedFilters(id)
      setActiveFilters(saved)
    })()
  }, [id])

  // Persist last-viewed board and record view timestamp
  useEffect(() => {
    if (!id || !user?.id || isAllBoards) return
    void (async () => {
      await setLastBoardId(user.id, id)
      await setLastViewedAt(user.id, id)
    })()
  }, [id, user?.id, isAllBoards])

  // Set tappable header title + filter badge button
  useEffect(() => {
    const title = isAllBoards ? 'All Boards' : (board?.title ?? 'Board')
    const activeCount =
      (activeFilters.status != null ? 1 : 0) +
      (activeFilters.assignee != null ? 1 : 0) +
      (activeFilters.label != null ? 1 : 0) +
      (searchQuery.length > 0 ? 1 : 0)
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={headerTitleStyles.button}
          accessibilityRole="button"
          accessibilityLabel={`${title} - tap to switch board`}
        >
          <Text style={[headerTitleStyles.text, { color: theme.colors.foreground }]}>
            {title}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.mutedForeground} />
        </Pressable>
      ),
      headerRight: !isAllBoards
        ? () => (
            <FilterBadgeButton
              activeCount={activeCount}
              onPress={() => {
                sectionListRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true })
              }}
              theme={theme}
            />
          )
        : undefined,
    })
  }, [board?.title, isAllBoards, navigation, theme, activeFilters, searchQuery])

  const loadTasks = useCallback(async () => {
    if (!id || !user?.id || isAllBoards) return

    const cached = await getCached<Task[]>(['tasks', user.id, id])
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
      const [result, fields] = await Promise.all([
        fetchBoardItems(pat, id),
        fetchBoardFields(pat, user.id, id),
      ])
      await setCached(['tasks', user.id, id], result)
      setTasks(id, result)
      setFields(id, fields)
      captureEvent('board_opened', { item_count: result.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('401') || message.toLowerCase().includes('expired')) {
        setError('Your GitHub token has expired. Please relink your account.')
      } else if (message.includes('403') || message.toLowerCase().includes('rate limit')) {
        setError('GitHub API rate limit reached. Please wait a moment and try again.')
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        setError('Network error. Check your connection and try again.')
      } else {
        setError('Failed to load tasks. Please try again.')
      }
    }
  }, [id, user?.id, isAllBoards, setTasks, setLoading, setError, setFields])

  const loadAllBoardsTasks = useCallback(async () => {
    if (!isAllBoards || !user?.id || boards.length === 0) return

    setLoading(true)
    setError(null)
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        setError('Could not retrieve your GitHub token. Try relinking your account.')
        return
      }
      for (const b of boards) {
        const cached = await getCached<Task[]>(['tasks', user.id, b.id])
        if (cached && !tasksByBoard[b.id]) {
          setTasks(b.id, cached)
        }
      }
      const unloaded = boards.filter((b) => !tasksByBoard[b.id])
      await Promise.all(
        unloaded.map(async (b) => {
          const result = await fetchBoardItems(pat, b.id)
          await setCached(['tasks', user.id, b.id], result)
          setTasks(b.id, result)
        })
      )
    } catch {
      setError('Failed to load tasks. Please try again.')
    }
  }, [isAllBoards, user?.id, boards, tasksByBoard, setTasks, setLoading, setError])

  const loadStatusField = useCallback(async () => {
    if (!id || !user?.id) return
    const cached = await getCached<StatusField>(['status-field', id])
    if (cached) {
      setStatusFieldState(cached)
      return
    }
    try {
      const pat = await fetchGithubPAT(user.id)
      if (!pat) return
      const field = await fetchStatusField(pat, id)
      if (field) {
        await setCached(['status-field', id], field)
        setStatusFieldState(field)
      }
    } catch {
      // Non-critical - complete gesture will not be available
    }
  }, [id, user?.id])

  useEffect(() => {
    if (isAllBoards) {
      void loadAllBoardsTasks()
    } else {
      void loadTasks()
      void loadStatusField()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])

  // After tasks load, scroll past the search header to hide it initially
  const tasks = isAllBoards ? null : (id ? (tasksByBoard[id] ?? null) : null)
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const timer = setTimeout(() => {
        sectionListRef.current?.getScrollResponder()?.scrollTo({
          y: SEARCH_HEADER_HEIGHT,
          animated: false,
        })
      }, 80)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks?.length === 0 ? null : id])

  // Commit any pending undo actions when leaving the screen
  useEffect(() => {
    return () => {
      const pending = pendingUndo.current
      if (!pending) return
      clearTimeout(pending.apiTimerId)
      if (pending.type === 'complete') {
        clearTimeout(pending.removeTimerId)
      }
      if (user?.id) {
        void fetchGithubPAT(user.id).then((pat) => {
          if (!pat) return
          if (pending.type === 'complete') {
            void setTaskStatus(pat, pending.boardId, pending.task.id, pending.fieldId, pending.doneOptionId)
          } else {
            void removeTaskFromBoard(pat, pending.boardId, pending.task.id)
          }
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const onRefresh = useCallback(() => {
    if (isAllBoards) {
      void loadAllBoardsTasks()
    } else {
      void loadTasks()
    }
  }, [isAllBoards, loadAllBoardsTasks, loadTasks])

  const handleBoardSelect = useCallback(
    (boardId: string) => {
      setPickerVisible(false)
      if (boardId === id) return
      router.replace({ pathname: '/(app)/board/[id]', params: { id: boardId } })
    },
    [id, router]
  )

  const handleQuickAdd = useCallback(
    async (title: string) => {
      if (!id || !user?.id) return

      const tempId = `temp-${Date.now()}`
      const optimisticTask: Task = {
        id: tempId,
        title,
        status: statusField?.options[0]?.name ?? null,
        statusOptionId: statusField?.options[0]?.id ?? null,
        assignees: [],
        labels: [],
        issueNumber: null,
        issueState: null,
        isDraft: true,
        fieldValues: [],
      }
      prependTask(id, optimisticTask)

      const pat = await fetchGithubPAT(user.id)
      if (!pat) {
        removeTask(id, tempId)
        throw new Error('Could not retrieve GitHub token.')
      }

      try {
        const realTask = await addDraftTask(pat, id, title)
        replaceTask(id, tempId, realTask)

        const current = useTasksStore.getState().tasksByBoard[id] ?? []
        await setCached(['tasks', user.id, id], current)
      } catch (err) {
        removeTask(id, tempId)
        throw err
      }
    },
    [id, user?.id, statusField, prependTask, removeTask, replaceTask]
  )

  const doneOption = useMemo(
    () => (statusField ? findDoneOption(statusField.options) : undefined),
    [statusField]
  )

  const showUndoToast = useCallback((label: string) => {
    setUndoToastLabel(label)
    setUndoToastVisible(true)
  }, [])

  const hideUndoToast = useCallback(() => {
    setUndoToastVisible(false)
  }, [])

  const handleComplete = useCallback(
    (task: Task) => {
      if (!id || !user?.id || !statusField || !doneOption) return

      if (pendingUndo.current) {
        const prev = pendingUndo.current
        clearTimeout(prev.apiTimerId)
        if (prev.type === 'complete') clearTimeout(prev.removeTimerId)
        void fetchGithubPAT(user.id).then((pat) => {
          if (!pat) return
          if (prev.type === 'complete') {
            void setTaskStatus(pat, prev.boardId, prev.task.id, prev.fieldId, prev.doneOptionId)
          } else {
            void removeTaskFromBoard(pat, prev.boardId, prev.task.id)
          }
        })
        pendingUndo.current = null
        hideUndoToast()
      }

      setCompletingIds((prev) => new Set([...prev, task.id]))

      const removeTimerId = setTimeout(() => {
        removeTask(id, task.id)
        setCompletingIds((prev) => {
          const next = new Set(prev)
          next.delete(task.id)
          return next
        })
      }, 350)

      const truncated = task.title.length > 25 ? task.title.slice(0, 22) + '...' : task.title
      showUndoToast(`Completed "${truncated}"`)

      const apiTimerId = setTimeout(() => {
        pendingUndo.current = null
        hideUndoToast()
        void fetchGithubPAT(user.id).then((pat) => {
          if (!pat) return
          void setTaskStatus(pat, id, task.id, statusField.fieldId, doneOption.id).catch(() => {})
        })
      }, 5000)

      pendingUndo.current = {
        type: 'complete',
        task,
        boardId: id,
        removeTimerId,
        apiTimerId,
        fieldId: statusField.fieldId,
        doneOptionId: doneOption.id,
      }
    },
    [id, user?.id, statusField, doneOption, removeTask, showUndoToast, hideUndoToast]
  )

  const handleDelete = useCallback(
    (task: Task) => {
      if (!id || !user?.id) return

      if (pendingUndo.current) {
        const prev = pendingUndo.current
        clearTimeout(prev.apiTimerId)
        if (prev.type === 'complete') clearTimeout(prev.removeTimerId)
        void fetchGithubPAT(user.id).then((pat) => {
          if (!pat) return
          if (prev.type === 'complete') {
            void setTaskStatus(pat, prev.boardId, prev.task.id, prev.fieldId, prev.doneOptionId)
          } else {
            void removeTaskFromBoard(pat, prev.boardId, prev.task.id)
          }
        })
        pendingUndo.current = null
        hideUndoToast()
      }

      removeTask(id, task.id)

      const truncated = task.title.length > 25 ? task.title.slice(0, 22) + '...' : task.title
      showUndoToast(`Removed "${truncated}"`)

      const apiTimerId = setTimeout(() => {
        pendingUndo.current = null
        hideUndoToast()
        void fetchGithubPAT(user.id).then((pat) => {
          if (!pat) return
          void removeTaskFromBoard(pat, id, task.id).catch(() => {})
        })
      }, 5000)

      pendingUndo.current = {
        type: 'delete',
        task,
        boardId: id,
        apiTimerId,
      }
    },
    [id, user?.id, removeTask, showUndoToast, hideUndoToast]
  )

  const handleUndo = useCallback(() => {
    const pending = pendingUndo.current
    if (!pending) return
    clearTimeout(pending.apiTimerId)
    if (pending.type === 'complete') {
      clearTimeout(pending.removeTimerId)
      setCompletingIds((prev) => {
        const next = new Set(prev)
        next.delete(pending.task.id)
        return next
      })
      const currentTasks = useTasksStore.getState().tasksByBoard[pending.boardId] ?? []
      if (!currentTasks.find((t) => t.id === pending.task.id)) {
        insertTask(pending.boardId, pending.task)
      }
    } else {
      insertTask(pending.boardId, pending.task)
    }
    pendingUndo.current = null
    hideUndoToast()
  }, [insertTask, hideUndoToast])

  // Persist filter changes to cache
  const updateFilters = useCallback(
    (next: ActiveFilters) => {
      setActiveFilters(next)
      if (id) void setPersistedFilters(id, next)
    },
    [id]
  )

  const handleFilterChipPress = useCallback(
    (key: FilterKey) => {
      if (activeFilters[key] != null) {
        const next = { ...activeFilters }
        delete next[key]
        updateFilters(next)
      } else {
        setFilterPickerKey(key)
      }
    },
    [activeFilters, updateFilters]
  )

  const handleFilterSelect = useCallback(
    (value: string) => {
      if (!filterPickerKey) return
      updateFilters({ ...activeFilters, [filterPickerKey]: value })
      setFilterPickerKey(null)
    },
    [filterPickerKey, activeFilters, updateFilters]
  )

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    updateFilters({})
  }, [updateFilters])

  const { theme: t } = useTheme()
  const s = useMemo(() => styles(t), [t])

  // Derived: unique statuses and assignees from all tasks
  const availableStatuses = useMemo(() => {
    if (!tasks) return []
    const seen = new Set<string>()
    for (const task of tasks) {
      if (task.status != null) seen.add(task.status)
    }
    return [...seen]
  }, [tasks])

  const availableAssignees = useMemo(() => {
    if (!tasks) return []
    const seen = new Set<string>()
    for (const task of tasks) {
      for (const a of task.assignees) seen.add(a.login)
    }
    return [...seen]
  }, [tasks])

  const availableLabels = useMemo(() => {
    if (!tasks) return []
    const seen = new Set<string>()
    for (const task of tasks) {
      for (const l of task.labels) seen.add(l.name)
    }
    return [...seen]
  }, [tasks])

  // Apply search + filters to produce the visible task list
  const filteredColumns: BoardColumn[] = useMemo(() => {
    if (!tasks) return []

    const q = searchQuery.toLowerCase().trim()
    const statusFilter = activeFilters.status
    const assigneeFilter = activeFilters.assignee
    const labelFilter = activeFilters.label

    let filtered = tasks
    if (q) {
      filtered = filtered.filter((task) => task.title.toLowerCase().includes(q))
    }
    if (statusFilter != null) {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }
    if (assigneeFilter != null) {
      filtered = filtered.filter((task) =>
        task.assignees.some((a) => a.login === assigneeFilter)
      )
    }
    if (labelFilter != null) {
      filtered = filtered.filter((task) =>
        task.labels.some((l) => l.name === labelFilter)
      )
    }

    return groupTasksByStatus(filtered)
  }, [tasks, searchQuery, activeFilters])

  const sections = useMemo(
    () =>
      filteredColumns.map((col) => ({
        title: col.name,
        data: col.tasks,
        count: col.tasks.length,
      })),
    [filteredColumns]
  )

  // Flat ordered list of visible task IDs — passed to task detail for prev/next navigation
  const filteredTaskIds = useMemo(
    () => filteredColumns.flatMap((col) => col.tasks.map((t) => t.id)).join(','),
    [filteredColumns]
  )

  const allBoardsSections = useMemo(() => {
    if (!isAllBoards) return []
    return boards
      .map((b) => {
        const boardTasks = (tasksByBoard[b.id] ?? []).slice(0, MAX_ITEMS_PER_BOARD)
        return { title: b.title, data: boardTasks, count: boardTasks.length, boardId: b.id }
      })
      .filter((sec) => sec.data.length > 0)
  }, [isAllBoards, boards, tasksByBoard])

  const isFiltering = searchQuery.length > 0 || Object.values(activeFilters).some((v) => v != null)
  const pickerOptions =
    filterPickerKey === 'status'
      ? availableStatuses
      : filterPickerKey === 'assignee'
        ? availableAssignees
        : filterPickerKey === 'label'
          ? availableLabels
          : []
  const pickerTitle =
    filterPickerKey === 'status'
      ? 'Filter by Status'
      : filterPickerKey === 'assignee'
        ? 'Filter by Assignee'
        : filterPickerKey === 'label'
          ? 'Filter by Label'
          : ''

  // ---- All Boards view ----
  if (isAllBoards) {
    return (
      <>
        <SectionList
          style={s.container}
          contentContainerStyle={s.content}
          sections={allBoardsSections}
          keyExtractor={(item) => item.id}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} count={section.count} theme={theme} />
          )}
          renderItem={({ item, section }) => (
            <View style={s.taskPadding}>
              <TaskCard
                task={item}
                theme={theme}
                onPress={() => {
                  const sec = section as { boardId: string; data: { id: string }[] }
                  const sectionTaskIds = sec.data.map((t) => t.id).join(',')
                  router.push({
                    pathname: '/(app)/task/[id]',
                    params: { id: item.id, boardId: sec.boardId, taskIds: sectionTaskIds },
                  })
                }}
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
          ListEmptyComponent={
            isLoading ? (
              <View style={s.container}>
                <SkeletonSection theme={theme} />
                <SkeletonSection theme={theme} />
              </View>
            ) : (
              <View style={s.centered}>
                <Ionicons name="albums-outline" size={48} color={theme.colors.mutedForeground} />
                <Text style={s.emptyTitle}>No tasks across boards</Text>
                <Text style={s.emptyBody}>
                  Add items to your GitHub boards and they will appear here.
                </Text>
              </View>
            )
          }
        />
        {pickerVisible && (
          <BoardPickerModal
            currentBoardId={ALL_BOARDS_ID}
            onSelect={handleBoardSelect}
            onClose={() => setPickerVisible(false)}
            theme={theme}
          />
        )}
      </>
    )
  }

  // ---- Single Board view ----

  if (isLoading && tasks === null) {
    return (
      <>
        <View style={s.container}>
          <SkeletonSection theme={theme} />
          <SkeletonSection theme={theme} />
          <SkeletonSection theme={theme} />
        </View>
        {pickerVisible && (
          <BoardPickerModal
            currentBoardId={id ?? ''}
            onSelect={handleBoardSelect}
            onClose={() => setPickerVisible(false)}
            theme={theme}
          />
        )}
      </>
    )
  }

  if (error && tasks === null) {
    return (
      <>
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
        {pickerVisible && (
          <BoardPickerModal
            currentBoardId={id ?? ''}
            onSelect={handleBoardSelect}
            onClose={() => setPickerVisible(false)}
            theme={theme}
          />
        )}
      </>
    )
  }

  const searchFilterHeader = (
    <SearchFilterHeader
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      activeFilters={activeFilters}
      availableStatuses={availableStatuses}
      availableAssignees={availableAssignees}
      availableLabels={availableLabels}
      onFilterChipPress={handleFilterChipPress}
      onClearAll={handleClearAll}
      theme={theme}
    />
  )

  return (
    <>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        {tasks !== null && tasks.length === 0 ? (
          <View style={[s.container, s.centered]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={theme.colors.mutedForeground} />
            <Text style={s.emptyTitle}>No items yet</Text>
            <Text style={s.emptyBody}>
              Add your first task below or add issues to this board in GitHub.
            </Text>
          </View>
        ) : (
          <SectionList
            ref={sectionListRef}
            style={s.list}
            contentContainerStyle={s.content}
            sections={sections}
            keyExtractor={(item) => item.id}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={15}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={searchFilterHeader}
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} count={section.count} theme={theme} />
            )}
            renderItem={({ item }) => (
              <SwipeableRow
                task={item}
                theme={theme}
                canComplete={doneOption != null}
                isCompleting={completingIds.has(item.id)}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/task/[id]',
                    params: { id: item.id, boardId: id, taskIds: filteredTaskIds },
                  })
                }
                onComplete={handleComplete}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              isFiltering ? (
                <View style={s.filterEmpty}>
                  <Ionicons name="search-outline" size={40} color={theme.colors.mutedForeground} />
                  <Text style={s.emptyTitle}>No matching tasks</Text>
                  <Pressable
                    onPress={handleClearAll}
                    style={s.clearFiltersButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search and filters"
                  >
                    <Text style={s.clearFiltersLabel}>Clear search &amp; filters</Text>
                  </Pressable>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
            stickySectionHeadersEnabled
          />
        )}

        <QuickAddBar
          onSubmit={handleQuickAdd}
          theme={theme}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>
      <UndoToast
        visible={undoToastVisible}
        label={undoToastLabel}
        onUndo={handleUndo}
        theme={theme}
        // QuickAddBar height = paddingTop(12) + input(40) + paddingBottom(12 + insets.bottom)
        // Toast sits spacing[2] above that
        bottomOffset={spacing[3] + 40 + spacing[3] + insets.bottom + spacing[2]}
      />
      <FilterPickerModal
        visible={filterPickerKey != null}
        title={pickerTitle}
        options={pickerOptions}
        selected={filterPickerKey ? activeFilters[filterPickerKey] : undefined}
        onSelect={handleFilterSelect}
        onDismiss={() => setFilterPickerKey(null)}
        theme={theme}
      />
      {pickerVisible && (
        <BoardPickerModal
          currentBoardId={id ?? ''}
          onSelect={handleBoardSelect}
          onClose={() => setPickerVisible(false)}
          theme={theme}
        />
      )}
    </>
  )
}

const headerTitleStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
})

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    list: { flex: 1 },
    content: { paddingBottom: spacing[8] },
    taskPadding: { paddingHorizontal: spacing[5], paddingTop: spacing[2] },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[8],
    },
    filterEmpty: {
      alignItems: 'center',
      padding: spacing[8],
      gap: spacing[3],
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
    clearFiltersButton: {
      marginTop: spacing[2],
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[4],
    },
    clearFiltersLabel: {
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

export default function BoardScreen() {
  return (
    <EntitlementGate>
      <BoardScreenInner />
    </EntitlementGate>
  )
}
