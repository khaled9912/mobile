const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The Jitsi SDK ships SVG assets and imports them as components.
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = config;
