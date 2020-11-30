const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { resolve } = require('path')

module.exports = ({ mode } = { mode: 'production' }) => ({
  mode,
  entry: {
    popup: './popup/popup.mjs',
    background: './background.js',
    options: './options/options.mjs'
  },
  output: {
    filename: '[name].js',
    path: resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css/,
        use: ['style-loader', 'css-loader']
      }
      //   {
      //     test: /\.(mjs|jsx)/,
      //     exclude: /(node_modules)/,
      //     use: ['babel-loader']
      //   }
    ]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true
      })
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: './options/options.html'
    }),
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: './popup/popup.html'
    })
  ]
})
