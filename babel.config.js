// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetExpo = require('babel-preset-expo')

module.exports = (api) => {
  const isTest = api.env('test')
  return {
    presets: [
      [
        babelPresetExpo,
        {
          // Disable reanimated Babel plugin — requires react-native-worklets
          // which needs a native dev build. Re-enable when moving off Expo Go.
          reanimated: false,
        },
      ],
    ],
  }
}
