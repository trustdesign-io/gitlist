// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelPresetExpo = require('babel-preset-expo')

module.exports = (api) => {
  const isTest = api.env('test')
  return {
    presets: [babelPresetExpo],
  }
}
