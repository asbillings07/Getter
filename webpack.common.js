const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: { popup: path.resolve(__dirname, "src", "popup/popup.js"), background: path.resolve(__dirname, "src", "background.js"), crawlPage: path.resolve(__dirname, "src", "crawlPage.js") },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                exclude: /node_modules/,
                test: /\.(js|jsx)$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            }
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    experiments: {
        topLevelAwait: true,
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new HtmlWebpackPlugin({
            filename: "popup.html",
            template: "src/popup/index.html",
            chunks: ['popup']
        }),
        new HtmlWebpackPlugin({
            filename: "options.html",
            template: "src/options/index.html",
            chunks: ['options']
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: "public" },
                { from: "./src/images/CSS-Getter-Icon-16px.png" },
                { from: "./src/images/CSS-Getter-Icon-32px.png" },
                { from: "./src/images/CSS-Getter-Icon-48px.png" },
                { from: "./src/images/CSS-Getter-Icon-128px.png" },
                { from: "./src/utils/fontawesome.js" },
                { from: "./src/popup/popup.css" },
                { from: "./src/options/options.css" },
            ],
        }),
    ],
    output: { filename: "[name].js", path: path.resolve(__dirname, "dist") }, // chrome will look for files under dist/* folder
};