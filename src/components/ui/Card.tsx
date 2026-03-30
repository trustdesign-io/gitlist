import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native'
import { colors, borderRadius, spacing } from '@trustdesign/shared/tokens'

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>
}

export function Card({ style, children, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: colors.surface.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.surface.foreground,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
})
