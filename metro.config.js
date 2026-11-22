// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Website build: publish fonts/icons without "@" in their paths (see the plugin for why).
config.transformer.assetPlugins = [
  ...(config.transformer.assetPlugins ?? []),
  require.resolve('./scripts/metro-web-asset-paths.js'),
];

module.exports = config;
