const HtmlWebpackPlugin = require('html-webpack-plugin')
const { join, resolve } = require('path')

module.exports = ({ mode } = { mode: 'production' }) => ({
  mode,
  entry: join(__dirname, 'src', 'index.js'),
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
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve(__dirname, 'src', 'index.html')
    })
  ],
  devtool: 'eval-cheap-module-source-map',
  devServer: {
    host: '0.0.0.0',
    port: 3000
  }
})
