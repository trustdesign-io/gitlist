const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to fix 'folly/coro/Coroutine.h' file not found error.
 * Adds FOLLY_CFG_NO_COROUTINES=1 preprocessor definition to the Podfile post_install.
 */
function withFollyCoroutineFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfileContent = fs.readFileSync(podfilePath, "utf8");

      const follyFix = `
    # Fix folly/coro/Coroutine.h not found
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FOLLY_CFG_NO_COROUTINES=1'
      end
    end`;

      // Insert the fix before the closing of the post_install block
      podfileContent = podfileContent.replace(
        /react_native_post_install\(\s*\n\s*installer,\s*\n\s*config\[:reactNativePath\],\s*\n\s*:mac_catalyst_enabled => false,\s*\n\s*:ccache_enabled => ccache_enabled\?\(podfile_properties\),\s*\n\s*\)/,
        (match) => match + "\n" + follyFix
      );

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
}

module.exports = withFollyCoroutineFix;
