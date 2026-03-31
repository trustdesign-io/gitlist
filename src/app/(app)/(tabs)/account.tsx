import { useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useCurrentUser } from '../../../hooks/use-current-user'
import { signOut } from '../../../lib/auth'
import { Avatar } from '../../../components/ui/Avatar'
import { Divider } from '../../../components/ui/Divider'
import { fontSize, spacing } from '@trustdesign/shared/tokens'
import { useTheme } from '../../../contexts/ThemeContext'

export default function AccountScreen() {
  const user = useCurrentUser()
  const router = useRouter()
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut() } },
    ])
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Avatar name={user?.name} size="lg" style={s.avatar} />
        <Text style={s.name}>{user?.name ?? 'Unknown'}</Text>
        <Text style={s.email}>{user?.email ?? ''}</Text>
      </View>
      <View style={s.menu}>
        <Pressable style={s.menuItem} onPress={() => router.push('/(app)/profile')} accessibilityRole="button" accessibilityLabel="Edit profile">
          <Text style={s.menuItemText}>Edit profile</Text>
          <Text style={s.menuItemChevron}>\u203a</Text>
        </Pressable>
        <Divider />
        <Pressable style={s.menuItem} onPress={() => router.push('/(app)/settings')} accessibilityRole="button" accessibilityLabel="Settings">
          <Text style={s.menuItemText}>Settings</Text>
          <Text style={s.menuItemChevron}>\u203a</Text>
        </Pressable>
        <Divider />
        <Pressable style={s.menuItem} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out">
          <Text style={[s.menuItemText, s.signOut]}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.muted },
    header: { alignItems: 'center', paddingVertical: spacing[8], backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    avatar: { marginBottom: spacing[3] },
    name: { fontSize: fontSize.xl.size, lineHeight: fontSize.xl.lineHeight, fontWeight: '600', color: theme.colors.foreground },
    email: { fontSize: fontSize.sm.size, lineHeight: fontSize.sm.lineHeight, color: theme.colors.mutedForeground, marginTop: spacing[1] },
    menu: { marginTop: spacing[6], backgroundColor: theme.colors.card, borderTopWidth: 1, borderTopColor: theme.colors.border, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[6], paddingVertical: spacing[4] },
    menuItemText: { fontSize: fontSize.base.size, lineHeight: fontSize.base.lineHeight, color: theme.colors.foreground },
    menuItemChevron: { fontSize: fontSize.xl.size, lineHeight: fontSize.xl.lineHeight, color: theme.colors.mutedForeground },
    signOut: { color: theme.colors.error },
  })
}
