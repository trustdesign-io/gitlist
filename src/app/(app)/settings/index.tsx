import { View, Text, StyleSheet, Switch, Pressable, Alert, Linking } from 'react-native'
import { useState, useMemo } from 'react'
import * as Notifications from 'expo-notifications'
import { useGithubStore } from '../../../stores/github-store'
import { useTheme } from '../../../contexts/ThemeContext'
import type { ColorScheme } from '../../../lib/theme'

const SCHEME_LABELS: Record<ColorScheme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const SCHEME_OPTIONS: ColorScheme[] = ['system', 'light', 'dark']

export default function SettingsScreen() {
  const { theme, colorScheme, setColorScheme } = useTheme()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const { githubUsername } = useGithubStore()

  const s = useMemo(() => styles(theme), [theme])

  async function toggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in your device settings to receive updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        )
        return
      }
    }
    setNotificationsEnabled(value)
  }

  function cycleColorScheme() {
    const currentIndex = SCHEME_OPTIONS.indexOf(colorScheme)
    const next = SCHEME_OPTIONS[(currentIndex + 1) % SCHEME_OPTIONS.length]
    setColorScheme(next)
  }

  return (
    <View style={s.container}>
      <Text style={s.sectionHeader}>GitHub</Text>
      <View style={s.section}>
        <View style={s.row}>
          <Text style={s.rowLabel}>Connected as</Text>
          <Text style={s.rowValueGreen}>
            {githubUsername ? `@${githubUsername}` : 'Connected'}
          </Text>
        </View>
      </View>

      <Text style={s.sectionHeader}>Preferences</Text>
      <View style={s.section}>
        <View style={s.row}>
          <Text style={s.rowLabel}>Push notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>
        <Pressable
          style={s.row}
          onPress={cycleColorScheme}
          accessibilityRole="button"
          accessibilityHint="Cycles between system, light, and dark appearance"
        >
          <Text style={s.rowLabel}>Appearance</Text>
          <Text style={s.rowValue}>{SCHEME_LABELS[colorScheme]}</Text>
        </Pressable>
      </View>

      <Text style={s.sectionHeader}>About</Text>
      <View style={s.section}>
        <Pressable style={s.row}>
          <Text style={s.rowLabel}>Privacy policy</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <Pressable style={s.row}>
          <Text style={s.rowLabel}>Terms of service</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <View style={s.row}>
          <Text style={s.rowLabel}>Version</Text>
          <Text style={s.rowValue}>1.0.0</Text>
        </View>
      </View>

      <Text style={s.sectionHeader}>Danger zone</Text>
      <View style={s.section}>
        <Pressable
          style={s.row}
          onPress={() =>
            Alert.alert(
              'Delete account',
              'This action cannot be undone. Contact support to delete your account.',
              [{ text: 'OK' }]
            )
          }
        >
          <Text style={[s.rowLabel, s.danger]}>Delete account</Text>
        </Pressable>
      </View>
    </View>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.muted,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 8,
    },
    section: {
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.muted,
    },
    rowLabel: {
      fontSize: 16,
      color: theme.colors.foreground,
    },
    rowValue: {
      fontSize: 16,
      color: theme.colors.mutedForeground,
    },
    rowValueGreen: {
      fontSize: 16,
      color: theme.colors.success,
    },
    chevron: {
      fontSize: 20,
      color: theme.colors.mutedForeground,
    },
    danger: {
      color: theme.colors.error,
    },
  })
}
