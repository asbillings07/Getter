module.exports = function (api) {
    api.cache(false)
    const presets = [['@babel/preset-env'], ['@babel/preset-react']]
    const plugins = [
        '@babel/transform-runtime', 
    // 'babel-plugin-styled-components'
]
    return {
        presets,
        plugins
    }
}