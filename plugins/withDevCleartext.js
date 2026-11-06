const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Release Android builds reject plain http, so a development build that talks
 * to a local API needs the cleartext exception in the merged manifest. Production
 * builds leave it out and stay https-only.
 */
module.exports = function withDevCleartext(config, { enabled = false } = {}) {
  if (!enabled) return config;
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;
    application.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
