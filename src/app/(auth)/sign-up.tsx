import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native'
import { Link } from 'expo-router'
import { signUpWithEmail } from '../../lib/auth'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/TextInput'
import { fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../contexts/ThemeContext'

export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  async function handleSignUp() {
    setIsSubmitting(true)
    const result = await signUpWithEmail(name, email, password)
    setIsSubmitting(false)
    if (!result.success) {
      Alert.alert('Sign up failed', result.error)
    } else {
      Alert.alert('Check your email', 'We sent you a confirmation link.')
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.content}>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Get started with your new account</Text>
        <View style={s.form}>
          <TextInput label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType="name" />
          <TextInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <TextInput label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <Button onPress={handleSignUp} loading={isSubmitting} style={s.submitButton}>Create account</Button>
        </View>
        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link"><Text style={s.link}>Sign in</Text></Pressable>
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
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing[6] },
    footerText: { fontSize: fontSize.sm.size, color: theme.colors.mutedForeground },
    link: { fontSize: fontSize.sm.size, color: theme.colors.primary, fontWeight: '500' },
  })
}
