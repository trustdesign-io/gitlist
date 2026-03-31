import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput as RNTextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import Markdown from 'react-native-markdown-display'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing, borderRadius } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { fetchGithubPAT } from '../../../lib/github-pat'
import {
  fetchTaskDetail,
  type TaskDetail,
  type TaskAssignee,
  type TaskLabel,
  type RawFieldValue,
} from '../../../lib/github'
import { updateFieldValue, type FieldMapping, type FieldOption } from '../../../lib/board-fields'
import { useTasksStore } from '../../../stores/tasks-store'
import { useFieldsStore } from '../../../stores/fields-store'
import { Avatar } from '../../../components/ui/Avatar'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fields that are shown elsewhere in the UI and should not appear in the dynamic section. */
const EXCLUDED_FIELD_NAMES = new Set(['title', 'status', 'assignees', 'labels'])

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
// Metadata row (read-only, for created/updated dates)
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
// Field editor modal
// ---------------------------------------------------------------------------

interface EditFieldModalProps {
  mapping: FieldMapping
  currentValue: RawFieldValue | undefined
  onConfirm: (value: string, optionId?: string) => Promise<void>
  onClose: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function EditFieldModal({ mapping, currentValue, onConfirm, onClose, theme }: EditFieldModalProps) {
  const [inputValue, setInputValue] = useState(currentValue?.value ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const insets = useSafeAreaInsets()
  const s = useMemo(() => modalStyles(theme), [theme])

  const handleSelectOption = async (option: FieldOption) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      await onConfirm(option.name, option.id)
      await Haptics.selectionAsync()
      onClose()
    } catch {
      setSaveError('Failed to update. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTextConfirm = async () => {
    if (!inputValue.trim()) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await onConfirm(inputValue.trim())
      await Haptics.selectionAsync()
      onClose()
    } catch {
      setSaveError('Failed to update. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.sheetWrapper}
      >
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.fieldName}>{mapping.field.name}</Text>
            <Pressable
              onPress={onClose}
              style={s.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={s.closeLabel}>Cancel</Text>
            </Pressable>
          </View>

          {saveError != null && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Content per control type */}
          {mapping.control === 'single-select-picker' && (
            <FlatList
              data={mapping.field.options}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === currentValue?.optionId
                return (
                  <Pressable
                    style={[s.optionRow, isSelected && s.optionRowSelected]}
                    onPress={() => !isSaving && void handleSelectOption(item)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={item.name}
                  >
                    <Text style={[s.optionLabel, isSelected && s.optionLabelSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={theme.colors.primary} />
                    )}
                    {isSaving && isSelected && (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    )}
                  </Pressable>
                )
              }}
              style={s.optionList}
            />
          )}

          {(mapping.control === 'text-input' ||
            mapping.control === 'number-input' ||
            mapping.control === 'date-input') && (
            <View style={s.textInputSection}>
              <RNTextInput
                style={s.textInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={
                  mapping.control === 'date-input'
                    ? 'YYYY-MM-DD'
                    : `Enter ${mapping.field.name.toLowerCase()}…`
                }
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType={mapping.control === 'number-input' ? 'numeric' : 'default'}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleTextConfirm}
                accessibilityLabel={mapping.field.name}
              />
              <Pressable
                style={[s.saveButton, isSaving && s.saveButtonDisabled]}
                onPress={handleTextConfirm}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface.background} size="small" />
                ) : (
                  <Text style={s.saveLabel}>Save</Text>
                )}
              </Pressable>
            </View>
          )}

          {mapping.control === 'read-only' && (
            <View style={s.readOnlyNote}>
              <Text style={s.readOnlyText}>
                This field type cannot be edited in the app. Open in GitHub to make changes.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function modalStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '75%',
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
    fieldName: {
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
    errorBanner: {
      backgroundColor: theme.colors.error,
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[2],
    },
    errorText: {
      color: colors.surface.background,
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
    },
    optionList: { flexGrow: 0 },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[5],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    optionRowSelected: {
      backgroundColor: theme.colors.primary + '0d',
    },
    optionLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
      flex: 1,
    },
    optionLabelSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    textInputSection: {
      padding: spacing[5],
      gap: spacing[3],
    },
    textInput: {
      backgroundColor: theme.colors.input,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.foreground,
      minHeight: 48,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing[3],
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: colors.surface.background,
    },
    readOnlyNote: {
      padding: spacing[5],
    },
    readOnlyText: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
    },
  })
}

// ---------------------------------------------------------------------------
// Dynamic field row
// ---------------------------------------------------------------------------

interface FieldRowProps {
  mapping: FieldMapping
  rawField: RawFieldValue | undefined
  onPress: () => void
  theme: ReturnType<typeof useTheme>['theme']
}

function FieldRow({ mapping, rawField, onPress, theme }: FieldRowProps) {
  const isEditable = mapping.control !== 'read-only'
  const s = useMemo(() => fieldRowStyles(theme), [theme])

  return (
    <Pressable
      style={[s.row, !isEditable && s.rowReadOnly]}
      onPress={isEditable ? onPress : undefined}
      accessibilityRole={isEditable ? 'button' : 'text'}
      accessibilityLabel={`${mapping.field.name}: ${rawField?.value ?? 'Not set'}`}
    >
      <Text style={s.label}>{mapping.field.name}</Text>
      <View style={s.valueRow}>
        <Text style={[s.value, rawField?.value == null && s.valueEmpty]}>
          {rawField?.value ?? 'Not set'}
        </Text>
        {isEditable && (
          <Ionicons name="chevron-forward" size={14} color={theme.colors.mutedForeground} />
        )}
      </View>
    </Pressable>
  )
}

function fieldRowStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowReadOnly: { opacity: 0.7 },
    label: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      fontWeight: '500',
      flex: 1,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      flexShrink: 1,
    },
    value: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.foreground,
      fontWeight: '500',
      textAlign: 'right',
    },
    valueEmpty: {
      color: theme.colors.mutedForeground,
      fontStyle: 'italic',
    },
  })
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function TaskDetailScreen() {
  const { id, boardId, taskIds } = useLocalSearchParams<{
    id: string
    boardId?: string
    taskIds?: string
  }>()
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const user = useCurrentUser()
  const router = useRouter()
  const navigation = useNavigation()

  const tasksByBoard = useTasksStore((state) => state.tasksByBoard)
  const updateTask = useTasksStore((state) => state.updateTask)
  const fieldsByBoard = useFieldsStore((state) => state.fieldsByBoard)

  const [detail, setDetail] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFieldMapping, setActiveFieldMapping] = useState<FieldMapping | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    if (!statusError) return
    const t = setTimeout(() => setStatusError(null), 3000)
    return () => clearTimeout(t)
  }, [statusError])

  // Task-to-task navigation
  const orderedTaskIds = useMemo<string[]>(() => {
    if (!taskIds) return []
    return taskIds.split(',').filter(Boolean)
  }, [taskIds])

  const currentIndex = useMemo(
    () => (id ? orderedTaskIds.indexOf(id) : -1),
    [id, orderedTaskIds]
  )

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < orderedTaskIds.length - 1

  const navigateToTask = useCallback(
    (targetId: string) => {
      // router.replace swaps the current screen in the stack so back still returns to the board,
      // and ensures useLocalSearchParams updates reliably (more predictable than setParams).
      router.replace({
        pathname: '/(app)/task/[id]',
        params: { id: targetId, boardId, taskIds },
      })
    },
    [router, boardId, taskIds]
  )

  const fieldMappings = boardId ? (fieldsByBoard[boardId] ?? []) : []
  const statusFieldMapping = fieldMappings.find((m) => m.isStatus) ?? null

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
    if (cachedTask) {
      navigation.setOptions({ title: cachedTask.title })
    }
    void loadDetail()
  }, [cachedTask, loadDetail, navigation])

  const handleFieldChange = useCallback(
    async (mapping: FieldMapping, newValue: string, optionId?: string) => {
      if (!id || !boardId || !user?.id) return

      const pat = await fetchGithubPAT(user.id)
      if (!pat) throw new Error('Could not retrieve GitHub token.')

      let updateVal: Parameters<typeof updateFieldValue>[4]
      if (mapping.control === 'single-select-picker' && optionId) {
        updateVal = { singleSelectOptionId: optionId }
      } else if (mapping.control === 'date-input') {
        updateVal = { date: newValue }
      } else if (mapping.control === 'number-input') {
        updateVal = { number: parseFloat(newValue) }
      } else {
        updateVal = { text: newValue }
      }

      await updateFieldValue(pat, boardId, id, mapping.field.id, updateVal)

      // Update local state optimistically after confirmed save
      setDetail((prev) => {
        if (!prev) return prev
        const updated = prev.rawFields.map((f) =>
          f.fieldName === mapping.field.name
            ? { ...f, value: newValue, optionId: optionId ?? null }
            : f
        )
        // Add the field if it wasn't in rawFields yet
        const exists = prev.rawFields.some((f) => f.fieldName === mapping.field.name)
        return {
          ...prev,
          rawFields: exists
            ? updated
            : [...prev.rawFields, { fieldName: mapping.field.name, value: newValue, optionId: optionId ?? null }],
        }
      })
    },
    [id, boardId, user?.id]
  )

  // Optimistic status change — updates UI immediately, API fires in background, reverts on error.
  // This function intentionally never throws: it returns a resolved promise so EditFieldModal
  // closes right away without showing a spinner. All error handling is via the statusError toast.
  // NOTE: `detail` is a dep so prevStatus is always fresh at call time. The stale-closure
  // risk is negligible because no background refresh runs while the modal is open.
  const handleStatusChange = useCallback(
    async (optionName: string, optionId?: string): Promise<void> => {
      if (!id || !boardId || !user?.id || !statusFieldMapping || !detail) return
      // A valid optionId is required for the single-select mutation.
      // Without it we would send an empty string to the GitHub API, which is malformed.
      if (!optionId) {
        setStatusError('Failed to update status. Please try again.')
        return
      }

      const prevStatus = detail.status
      const prevStatusRaw = detail.rawFields.find(
        (f) => f.fieldName.toLowerCase() === 'status'
      ) ?? null

      // Optimistic: update status in local state immediately so the badge reflects the tap
      setDetail((prev) => {
        if (!prev) return prev
        const exists = prev.rawFields.some((f) => f.fieldName.toLowerCase() === 'status')
        const updatedRaw = exists
          ? prev.rawFields.map((f) =>
              f.fieldName.toLowerCase() === 'status'
                ? { ...f, value: optionName, optionId: optionId }
                : f
            )
          : [...prev.rawFields, { fieldName: 'Status', value: optionName, optionId: optionId }]
        return { ...prev, status: optionName, rawFields: updatedRaw }
      })
      // Keep the board list in sync (board screen sees the new status without refreshing)
      updateTask(boardId, id, { status: optionName, statusOptionId: optionId })
      // Haptic fires on user action, not after the API resolves
      void Haptics.selectionAsync()

      // Fire API in background — do NOT await here so EditFieldModal closes immediately
      void (async () => {
        try {
          const pat = await fetchGithubPAT(user.id)
          if (!pat) throw new Error('No token')
          await updateFieldValue(pat, boardId, id, statusFieldMapping.field.id, {
            singleSelectOptionId: optionId,
          })
        } catch {
          // Revert on failure
          setDetail((prev) => {
            if (!prev) return prev
            const reverted = prevStatusRaw
              ? prev.rawFields.map((f) =>
                  f.fieldName.toLowerCase() === 'status' ? prevStatusRaw : f
                )
              : prev.rawFields.filter((f) => f.fieldName.toLowerCase() !== 'status')
            return { ...prev, status: prevStatus, rawFields: reverted }
          })
          updateTask(boardId, id, { status: prevStatus, statusOptionId: prevStatusRaw?.optionId ?? null })
          setStatusError('Failed to update status. Please try again.')
        }
      })()
    },
    [id, boardId, user?.id, statusFieldMapping, detail, updateTask]
  )

  const s = useMemo(
    () => styles(theme, insets.bottom, orderedTaskIds.length > 1 && currentIndex >= 0),
    [theme, insets.bottom, orderedTaskIds.length, currentIndex]
  )
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

  // Fields to show in the dynamic section: all board fields except system/already-shown ones
  const dynamicFields = fieldMappings.filter(
    (m) => !EXCLUDED_FIELD_NAMES.has(m.field.name.toLowerCase())
  )

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {/* Title */}
        <Text style={s.title}>{detail.title}</Text>

        {/* Status + draft badge */}
        <View style={s.badgeRow}>
          {detail.status != null && (
            statusFieldMapping != null ? (
              <Pressable
                onPress={() => setActiveFieldMapping(statusFieldMapping)}
                accessibilityRole="button"
                accessibilityLabel={`Status: ${detail.status}. Tap to change.`}
                accessibilityHint="Opens a picker to change the task status"
              >
                <StatusBadge status={detail.status} />
              </Pressable>
            ) : (
              <StatusBadge status={detail.status} />
            )
          )}
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

        {/* Dynamic fields section */}
        {dynamicFields.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Fields</Text>
            <View style={s.fieldsCard}>
              {dynamicFields.map((mapping) => {
                const rawField = detail.rawFields.find(
                  (f) => f.fieldName.toLowerCase() === mapping.field.name.toLowerCase()
                )
                return (
                  <FieldRow
                    key={mapping.field.id}
                    mapping={mapping}
                    rawField={rawField}
                    theme={theme}
                    onPress={() => setActiveFieldMapping(mapping)}
                  />
                )
              })}
            </View>
          </View>
        )}

        {/* Timestamps */}
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

      {/* Field editor modal */}
      {activeFieldMapping != null && (
        <EditFieldModal
          mapping={activeFieldMapping}
          currentValue={detail.rawFields.find(
            (f) => f.fieldName.toLowerCase() === activeFieldMapping.field.name.toLowerCase()
          )}
          onConfirm={async (value, optionId) => {
            if (activeFieldMapping.isStatus) {
              await handleStatusChange(value, optionId)
            } else {
              await handleFieldChange(activeFieldMapping, value, optionId)
            }
          }}
          onClose={() => setActiveFieldMapping(null)}
          theme={theme}
        />
      )}

      {/* Status error toast */}
      {statusError != null && (
        <View style={s.errorToast} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={colors.surface.background} />
          <Text style={s.errorToastText}>{statusError}</Text>
        </View>
      )}

      {/* Task-to-task navigation bar — only shown when task is within the ordered list */}
      {orderedTaskIds.length > 1 && currentIndex >= 0 && (
        <View style={[s.navBar, { paddingBottom: insets.bottom + spacing[2] }]}>
          <Pressable
            style={[s.navButton, !hasPrev && s.navButtonDisabled]}
            onPress={() => hasPrev && navigateToTask(orderedTaskIds[currentIndex - 1])}
            disabled={!hasPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous task"
            accessibilityState={{ disabled: !hasPrev }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={hasPrev ? theme.colors.primary : theme.colors.mutedForeground}
            />
            <Text style={[s.navButtonLabel, !hasPrev && s.navButtonLabelDisabled]}>Prev</Text>
          </Pressable>

          <Text style={s.navPosition}>
            {currentIndex + 1} of {orderedTaskIds.length}
          </Text>

          <Pressable
            style={[s.navButton, !hasNext && s.navButtonDisabled]}
            onPress={() => hasNext && navigateToTask(orderedTaskIds[currentIndex + 1])}
            disabled={!hasNext}
            accessibilityRole="button"
            accessibilityLabel="Next task"
            accessibilityState={{ disabled: !hasNext }}
          >
            <Text style={[s.navButtonLabel, !hasNext && s.navButtonLabelDisabled]}>Next</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={hasNext ? theme.colors.primary : theme.colors.mutedForeground}
            />
          </Pressable>
        </View>
      )}
    </>
  )
}

const NAV_BAR_HEIGHT = 56

function styles(
  theme: ReturnType<typeof useTheme>['theme'],
  bottomInset: number,
  hasTaskNav: boolean
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: spacing[5],
      paddingBottom: hasTaskNav ? NAV_BAR_HEIGHT + bottomInset + spacing[4] : bottomInset + spacing[8],
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
    },
    sectionLabel: {
      fontSize: fontSize.xs.size,
      lineHeight: fontSize.xs.lineHeight,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing[2],
    },
    fieldsCard: {
      backgroundColor: theme.colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      paddingHorizontal: spacing[4],
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
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingVertical: spacing[2],
      paddingHorizontal: spacing[3],
      minWidth: 80,
    },
    navButtonDisabled: {
      opacity: 0.4,
    },
    navButtonLabel: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    navButtonLabelDisabled: {
      color: theme.colors.mutedForeground,
    },
    navPosition: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: theme.colors.mutedForeground,
      fontWeight: '500',
    },
    errorToast: {
      position: 'absolute',
      bottom: hasTaskNav ? NAV_BAR_HEIGHT + bottomInset + spacing[3] : bottomInset + spacing[5],
      left: spacing[5],
      right: spacing[5],
      backgroundColor: theme.colors.error,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    errorToastText: {
      fontSize: fontSize.sm.size,
      lineHeight: fontSize.sm.lineHeight,
      color: colors.surface.background,
      flex: 1,
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
