const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    // The dependency `rwanda-geo-structure` references `Rwanda.json` with incorrect casing.
    // Vue CLI's CaseSensitivePathsPlugin flags this on case-insensitive filesystems (macOS by default).
    // Disable the plugin so webpack resolves the file successfully.
    config.plugins.delete('case-sensitive-paths')
    
    // Define Vue feature flags and process.env for browser compatibility
    config.plugin('define').use(webpack.DefinePlugin, [{
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      'process.env': {
        VUE_APP_BACKEND_URL: JSON.stringify(process.env.VUE_APP_BACKEND_URL || 'http://localhost:5050')
      }
    }])
  }
})
