const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { join, resolve } = require('path')

module.exports = ({ mode } = { mode: 'production' }) => ({
  mode,
  entry: {
    popup: './popup/popup.mjs',
    background: './background.js',
    options: './options/options.js'
  },
  output: {
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)/,
        exclude: /(node_modules)/,
        use: ['babel-loader']
      }
    ]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true, // Must be set to true if using source-maps in production
        terserOptions: {
          // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
        }
      })
    ]
  },
  plugins: [
    new HtmlWebpackPlugin()
  ],
  devtool: 'eval-cheap-module-source-map'
})
