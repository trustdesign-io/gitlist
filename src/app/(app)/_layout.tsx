import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="link-github"
        options={{ headerShown: true, title: 'Link GitHub', presentation: 'card' }}
      />
      <Stack.Screen
        name="profile"
        options={{ headerShown: true, title: 'Profile', presentation: 'card' }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: true, title: 'Settings', presentation: 'card' }}
      />
    </Stack>
  )
}
