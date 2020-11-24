/* eslint-disable indent */
export default (function () {
    return function CreateColorElements () {
        return {
            createColorElement: function (elObj) {
                const containerDiv = document.createElement('div')
                const listItem = document.createElement('div')
                const { freq, style, rgbToHex, copyToClipboard } = elObj
                const colorDiv = document.createElement('div')
                const hexDiv = document.createElement('div')
                const description = document.createElement('p')
                containerDiv.id = 'liContainer'
                containerDiv.id = 'liContainer'
                colorDiv.id = 'colorDiv'
                colorDiv.className = 'mr'
                listItem.className = 'mr pointer'
                hexDiv.className = 'mr pointer'
                colorDiv.style.backgroundColor = rgbToHex(style)
                hexDiv.textContent = rgbToHex(style)
                hexDiv.addEventListener('click', copyToClipboard)
                listItem.textContent = `${style}`
                listItem.addEventListener('click', copyToClipboard)

                description.id = 'listDesc'
                description.textContent = `used ${freq.style.length} time(s)`

                containerDiv.appendChild(colorDiv)
                containerDiv.appendChild(listItem)
                containerDiv.appendChild(hexDiv)
                containerDiv.appendChild(description)

                return containerDiv
            },
            createFontElement: function (elObj) {
                const containerDiv = document.createElement('div')
                const listItem = document.createElement('div')
                const { freq, style, hightLightFontOnPage } = elObj
                listItem.textContent = style
                listItem.value = freq.id
                listItem.className = 'pointer'
                listItem.style.fontFamily = style
                listItem.addEventListener('click', hightLightFontOnPage)
                containerDiv.appendChild(listItem)
                return containerDiv
            },
            createDefaultElement: function (elObj) {
                // const containerDiv = document.createElement('div')
                const listItem = document.createElement('div')
                const { style } = elObj
                listItem.textContent = style
                return listItem
            }
        }
    }
}())
