// babel-preset-expo is Expo's default; inline-import turns drizzle/*.sql into strings (SRS 8.7).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
