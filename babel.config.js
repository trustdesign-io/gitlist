// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetExpo = require('expo/node_modules/babel-preset-expo')

module.exports = (api) => {
  const isTest = api.env('test')
  return {
    presets: [
      [
        babelPresetExpo,
        {
          // Disable reanimated/worklets Babel plugins in Jest — they require
          // react-native-worklets which is not a top-level dep (only -core is).
          reanimated: !isTest,
        },
      ],
    ],
  }
}
