import { defineConfig } from 'eslint/config'
import { baseRules } from '@trustdesign/shared/eslint'
import expoConfig from 'eslint-config-expo/flat.js'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig([
  // Expo-recommended rules (React, React Native, TypeScript, hooks)
  ...expoConfig,

  // Trustdesign shared base rules (type imports, no-any, prefer-const, no-console)
  ...baseRules,

  // Prettier — must be last to disable conflicting formatting rules
  prettierConfig,

  // Project-level overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Allow console in dev tools and scripts (overrides baseRules warn)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // react/no-unescaped-entities is web-only — HTML entities don't render in RN <Text>
      'react/no-unescaped-entities': 'off',
    },
  },

  // Ignore generated and installed files
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'build/**'],
  },
])
