import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { signInWithGitHub } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../contexts/ThemeContext'

export default function SignInScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  async function handleSignIn() {
    setIsSubmitting(true)
    const result = await signInWithGitHub()
    setIsSubmitting(false)
    if (!result.success) {
      Alert.alert('Sign in failed', result.error)
    }
  }

  return (
    <View style={s.container}>
      <View style={s.content}>
        <View style={s.logoContainer}>
          <Ionicons name="git-branch-outline" size={64} color={theme.colors.primary} />
        </View>
        <Text style={s.title}>Gitlist</Text>
        <Text style={s.subtitle}>Your GitHub boards, beautifully organized</Text>
        <Button onPress={handleSignIn} loading={isSubmitting} style={s.button}>
          Sign in with GitHub
        </Button>
      </View>
    </View>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing[8],
    },
    logoContainer: {
      marginBottom: spacing[4],
    },
    title: {
      fontSize: fontSize['3xl'].size,
      lineHeight: fontSize['3xl'].lineHeight,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: spacing[2],
    },
    subtitle: {
      fontSize: fontSize.base.size,
      lineHeight: fontSize.base.lineHeight,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      marginBottom: spacing[10],
    },
    button: {
      width: '100%',
    },
  })
}
