import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors } from '@trustdesign/shared/tokens'

interface DividerProps {
  style?: StyleProp<ViewStyle>
}

export function Divider({ style }: DividerProps) {
  return <View style={[styles.divider, style]} accessibilityRole="none" />
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface.border,
    width: '100%',
  },
})
