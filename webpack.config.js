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
    filename: '[name].[ext]',
    path: resolve('__dirname', '/dist')
  },
  //   module: {
  //     rules: [
  //       {
  //         test: /\.(js|jsx)/,
  //         exclude: /(node_modules)/,
  //         use: ['babel-loader']
  //       }
  //     ]
  //   },
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true
      })
    ]
  },
  plugins: [
    new HtmlWebpackPlugin()
  ],
  devtool: 'eval-cheap-module-source-map'
})
