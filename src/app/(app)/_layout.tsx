import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{ headerShown: true, title: 'Profile', presentation: 'card', headerBackVisible: true }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: true, title: 'Settings', presentation: 'card', headerBackVisible: true }}
      />
      <Stack.Screen
        name="board"
        options={{ headerShown: true, presentation: 'card', headerBackVisible: true }}
      />
      <Stack.Screen
        name="task"
        options={{ headerShown: true, presentation: 'card', headerBackVisible: true }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack>
  )
}
