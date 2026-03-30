import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, fontSize } from '@trustdesign/shared/tokens'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  uri?: string | null
  name?: string | null
  size?: AvatarSize
  style?: StyleProp<ViewStyle>
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: fontSize.sm.size,
  md: fontSize.lg.size,
  lg: fontSize.xl.size,
  xl: fontSize['2xl'].size,
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ uri, name, size = 'md', style }: AvatarProps) {
  const dimension = SIZE_MAP[size]
  const initials = name ? getInitials(name) : '?'
  const label = name ?? 'User avatar'

  return (
    <View
      style={[
        styles.container,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: dimension, height: dimension, borderRadius: dimension / 2 },
          ]}
          accessible={false}
        />
      ) : (
        <Text
          style={[styles.initials, { fontSize: FONT_SIZE_MAP[size] }]}
          accessible={false}
        >
          {initials}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: colors.surface.background,
    fontWeight: '600',
  },
})
