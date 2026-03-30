import { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/auth-store'
import { useGithubStore } from '../../stores/github-store'
import { validatePAT } from '../../lib/github'
import { saveGithubPAT, removeGithubPAT } from '../../lib/github-pat'
import { clearUserCache } from '../../lib/cache'
import { useTheme } from '../../contexts/ThemeContext'

export default function LinkGithubScreen() {
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])
  const router = useRouter()

  const user = useAuthStore((state) => state.user)
  const { githubUsername, isPatLinked, setGithubAccount } = useGithubStore()

  const [pat, setPat] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeWarning, setScopeWarning] = useState<string | null>(null)

  async function handleLink() {
    if (!user) return
    setError(null)
    setScopeWarning(null)

    const trimmed = pat.trim()
    if (!trimmed) {
      setError('Please enter a Personal Access Token.')
      return
    }

    setIsValidating(true)
    try {
      const result = await validatePAT(trimmed)

      if (!result.valid) {
        setError(result.error ?? 'Token validation failed.')
        return
      }

      if (result.missingScopes && result.missingScopes.length > 0) {
        setScopeWarning(
          `Warning: token is missing required scopes: ${result.missingScopes.join(', ')}. Some features may not work.`
        )
      }

      const saved = await saveGithubPAT(user.id, trimmed, result.username!)
      if (!saved.success) {
        setError(saved.error ?? 'Failed to save token.')
        return
      }

      setGithubAccount(result.username!)
      router.replace('/(app)/(tabs)')
    } finally {
      setIsValidating(false)
    }
  }

  function handleUnlink() {
    if (!user) return
    Alert.alert(
      'Unlink GitHub',
      'This will remove your GitHub token. You will need to re-link to access your boards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            const result = await removeGithubPAT(user.id)
            if (!result.success) {
              Alert.alert('Error', result.error ?? 'Failed to unlink account.')
              return
            }
            clearUserCache(user.id)
            setGithubAccount(null)
          },
        },
      ]
    )
  }

  if (isPatLinked && githubUsername) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.linkedCard}>
          <Text style={s.linkedLabel}>Connected as</Text>
          <Text style={s.linkedUsername}>@{githubUsername}</Text>
        </View>

        <Pressable
          style={s.unlinkButton}
          onPress={handleUnlink}
          accessibilityRole="button"
          accessibilityLabel="Unlink GitHub account"
        >
          <Text style={s.unlinkText}>Unlink GitHub</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.heading}>Link your GitHub account</Text>
      <Text style={s.description}>
        Create a Personal Access Token on GitHub with the following scopes, then paste it below.
      </Text>

      <View style={s.scopeBox}>
        <Text style={s.scopeTitle}>Required scopes</Text>
        <Text style={s.scopeItem}>• project — read and write GitHub Projects v2</Text>
        <Text style={s.scopeItem}>• read:org — read organisation membership</Text>
      </View>

      <Text style={s.label}>Personal Access Token</Text>
      <TextInput
        style={s.input}
        value={pat}
        onChangeText={(v) => {
          setPat(v)
          setError(null)
        }}
        placeholder="ghp_••••••••••••••••••••••••••••"
        placeholderTextColor={theme.colors.mutedForeground}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="GitHub Personal Access Token"
      />

      {error ? <Text style={s.error}>{error}</Text> : null}
      {scopeWarning ? <Text style={s.warning}>{scopeWarning}</Text> : null}

      <Pressable
        style={[s.button, isValidating && s.buttonDisabled]}
        onPress={handleLink}
        disabled={isValidating}
        accessibilityRole="button"
        accessibilityLabel="Validate and link token"
      >
        {isValidating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.buttonText}>Link GitHub</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.muted,
    },
    content: {
      padding: 24,
      paddingBottom: 48,
    },
    heading: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    description: {
      fontSize: 15,
      color: theme.colors.mutedForeground,
      lineHeight: 22,
      marginBottom: 20,
    },
    scopeBox: {
      backgroundColor: theme.colors.card,
      borderRadius: 10,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scopeTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.foreground,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    scopeItem: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
      lineHeight: 22,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: theme.colors.foreground,
      marginBottom: 12,
    },
    error: {
      fontSize: 14,
      color: theme.colors.error,
      marginBottom: 12,
    },
    warning: {
      fontSize: 14,
      color: theme.colors.warning,
      marginBottom: 12,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    linkedCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    linkedLabel: {
      fontSize: 13,
      color: theme.colors.mutedForeground,
      marginBottom: 4,
    },
    linkedUsername: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    unlinkButton: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    unlinkText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.error,
    },
  })
}
