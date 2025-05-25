module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules = webpackConfig.module.rules.filter(
        (rule) => !(rule.use && rule.use.some(u => u.loader && u.loader.includes('source-map-loader')))
      );
      return webpackConfig;
    },
  },
};
