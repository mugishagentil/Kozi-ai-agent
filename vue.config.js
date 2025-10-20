const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    // The dependency `rwanda-geo-structure` references `Rwanda.json` with incorrect casing.
    // Vue CLI's CaseSensitivePathsPlugin flags this on case-insensitive filesystems (macOS by default).
    // Disable the plugin so webpack resolves the file successfully.
    config.plugins.delete('case-sensitive-paths')
  }
})
