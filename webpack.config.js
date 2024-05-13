const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin")
const { resolve } = require('path')

module.exports = ({ mode } = { mode: 'developement' }) => ({
    mode,
    entry: {
        options: resolve(__dirname, 'src', 'options', 'index.js'),
        popup: resolve(__dirname, 'src', 'popup', 'index.js'),
        background: resolve(__dirname, 'src', 'background.js'),
    },
    resolve: {
        extensions: [".js", ".jsx"],
    },
    output: {
        filename: '[name].js',
        path: resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)/,
                exclude: /(node_modules)/,
                use: ['babel-loader']
            },
            {
                test: /\.css$/i,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                        },
                    }
                ],
            },
            {
                type: "assets/resource",
                test: /\.(png|jpg|jpeg|gif|woff|woff2|tff|eot|svg)$/,
            },
        ]
    },
    plugins: [
        ...getHtmlPlugins(['options', 'popup']),
        new CopyPlugin({
            patterns: [
                {
                    from: resolve("src/static"),
                    to: resolve("dist"),
                },
            ],
        }),
    ],
    devtool: 'source-map',
    devServer: {
        host: '0.0.0.0',
        port: 3000
    }
})

function getHtmlPlugins(chunks) {
    return chunks.map(
        (chunk) =>
            new HtmlWebpackPlugin({
                title: `${chunk} page`,
                filename: `${chunk}.html`,
                chunks: [chunk],
            })
    );
}