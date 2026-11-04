module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["@babel/plugin-transform-private-methods", { loose: true }],
      // Compiles the Jitsi SDK's 'worklet' functions for react-native-worklets-core.
      "react-native-worklets-core/plugin",
    ],
  };
};
