// Rive mascot files (.riv) load through require() like images.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('riv');
// Drizzle migrations of the local DB (SRS 8.7) are .sql files inlined by babel.
config.resolver.sourceExts.push('sql');

module.exports = config;
