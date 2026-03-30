import { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, Dimensions, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/auth-store'
import { useTheme } from '../../contexts/ThemeContext'

const { width } = Dimensions.get('window')

interface OnboardingStep {
  id: string
  title: string
  description: string
  emoji: string
}

const STEPS: OnboardingStep[] = [
  {
    id: '1',
    title: 'Welcome',
    description: 'Thanks for joining! Let us show you around.',
    emoji: '👋',
  },
  {
    id: '2',
    title: 'Stay connected',
    description:
      'Get notified about things that matter to you. You can customise this later in settings.',
    emoji: '🔔',
  },
  {
    id: '3',
    title: "You're all set",
    description: 'Start exploring and make this app your own.',
    emoji: '🚀',
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const { theme } = useTheme()
  const s = useMemo(() => styles(theme), [theme])

  function handleNext() {
    if (currentIndex < STEPS.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      if (user) {
        setUser({ ...user, onboardingCompletedAt: new Date() })
      }
      router.replace('/(app)/(tabs)')
    }
  }

  function handleSkip() {
    if (user) {
      setUser({ ...user, onboardingCompletedAt: new Date() })
    }
    router.replace('/(app)/(tabs)')
  }

  const renderItem = ({ item }: { item: OnboardingStep }) => (
    <View style={s.slide}>
      <Text style={s.emoji}>{item.emoji}</Text>
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.description}>{item.description}</Text>
    </View>
  )

  return (
    <View style={s.container}>
      <Pressable style={s.skipButton} onPress={handleSkip}>
        <Text style={s.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        data={STEPS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentOffset={{ x: currentIndex * width, y: 0 }}
      />

      <View style={s.footer}>
        <View style={s.dots}>
          {STEPS.map((_, index) => (
            <View key={index} style={[s.dot, index === currentIndex && s.dotActive]} />
          ))}
        </View>

        <Pressable style={s.button} onPress={handleNext}>
          <Text style={s.buttonText}>
            {currentIndex === STEPS.length - 1 ? 'Get started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

function styles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    skipButton: {
      position: 'absolute',
      top: 60,
      right: 24,
      zIndex: 1,
    },
    skipText: {
      fontSize: 16,
      color: theme.colors.mutedForeground,
    },
    slide: {
      width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emoji: {
      fontSize: 64,
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.foreground,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 48,
      alignItems: 'center',
    },
    dots: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
      marginHorizontal: 4,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
      width: 24,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      paddingVertical: 16,
      paddingHorizontal: 48,
      width: '100%',
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  })
}
