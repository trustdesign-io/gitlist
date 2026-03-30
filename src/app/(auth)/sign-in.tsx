import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native'
import { Link } from 'expo-router'
import { signInWithEmail, signInWithGoogle } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { Divider } from '../../components/ui/Divider'
import { TextInput } from '../../components/ui/TextInput'
import { fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../contexts/ThemeContext'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  async function handleSignIn() {
    setIsSubmitting(true)
    const result = await signInWithEmail(email, password)
    setIsSubmitting(false)
    if (!result.success) { Alert.alert('Sign in failed', result.error) }
  }

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true)
    const result = await signInWithGoogle()
    setIsGoogleSubmitting(false)
    if (!result.success) { Alert.alert('Sign in failed', result.error) }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.content}>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>
        <View style={s.form}>
          <TextInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <TextInput label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="password" textContentType="password" />
          <Button onPress={handleSignIn} loading={isSubmitting} style={s.submitButton}>Sign in</Button>
          <View style={s.dividerRow}>
            <Divider style={s.dividerLine} />
            <Text style={s.dividerLabel}>or</Text>
            <Divider style={s.dividerLine} />
          </View>
          <Button variant="outline" onPress={handleGoogleSignIn} loading={isGoogleSubmitting}>Continue with Google</Button>
        </View>
        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link"><Text style={s.link}>Sign up</Text></Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] },
    title: { fontSize: fontSize['3xl'].size, lineHeight: fontSize['3xl'].lineHeight, fontWeight: '700', color: theme.colors.foreground, marginBottom: spacing[2] },
    subtitle: { fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, color: theme.colors.mutedForeground, marginBottom: spacing[8] },
    form: { gap: spacing[3] },
    submitButton: { marginTop: spacing[3] },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: spacing[1] },
    dividerLine: { flex: 1 },
    dividerLabel: { fontSize: fontSize.sm.size, lineHeight: fontSize.sm.lineHeight, color: theme.colors.mutedForeground },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
    footerText: { fontSize: fontSize.sm.size, color: theme.colors.mutedForeground },
    link: { fontSize: fontSize.sm.size, color: theme.colors.primary, fontWeight: '500' },
  })
}
