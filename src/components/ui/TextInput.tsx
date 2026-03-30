import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { colors, borderRadius, fontSize, spacing } from '@trustdesign/shared/tokens'

interface LabelledTextInputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
}

export function TextInput({
  label,
  error,
  containerStyle,
  editable = true,
  style,
  ...props
}: LabelledTextInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <RNTextInput
        style={[
          styles.input,
          !editable && styles.inputDisabled,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={colors.surface.mutedForeground}
        editable={editable}
        accessibilityLabel={label}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.sm.size,
    lineHeight: fontSize.sm.lineHeight,
    fontWeight: '500',
    color: colors.surface.foreground,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    fontSize: fontSize.base.size,
    lineHeight: fontSize.base.lineHeight,
    color: colors.surface.foreground,
    backgroundColor: colors.surface.muted,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: colors.neutral[100],
    color: colors.surface.mutedForeground,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  errorText: {
    fontSize: fontSize.xs.size,
    lineHeight: fontSize.xs.lineHeight,
    color: colors.semantic.error,
  },
})
