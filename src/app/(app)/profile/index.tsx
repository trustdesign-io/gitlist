import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useState, useMemo } from 'react'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/auth-store'
import { Button } from '../../../components/ui/Button'
import { TextInput } from '../../../components/ui/TextInput'
import { spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'

export default function ProfileScreen() {
  const user = useCurrentUser()
  const setUser = useAuthStore((state) => state.setUser)
  const [name, setName] = useState(user?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { name } })
    setIsSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setUser({ ...user, name })
      Alert.alert('Saved', 'Your profile has been updated.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={s.container}
        contentContainerStyle={s.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.form}>
          <TextInput label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <TextInput label="Email" value={user?.email ?? ''} editable={false} />
        </View>
        <Button onPress={handleSave} loading={isSaving} style={s.saveButton}>Save changes</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    keyboardView: { flex: 1, backgroundColor: theme.colors.muted },
    container: { flex: 1 },
    contentContainer: { padding: spacing[6] },
    form: { gap: spacing[4] },
    saveButton: { marginTop: spacing[8] },
  })
}
