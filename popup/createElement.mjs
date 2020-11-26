/* eslint-disable indent */
import didact from './didact.mjs'
export default (function () {
    const { createElement, renderEl } = didact
    return function CreateColorElements () {
        return {
            createColorElement: function (elObj) {
                const { freq, style, rgbToHex, copyToClipboard } = elObj
                const listItem = createElement('div', { className: 'mr pointer', textContent: style, onclick: (e) => copyToClipboard(e) })
                const hexDiv = createElement('div', { className: 'mr pointer', textContent: rgbToHex(style), onclick: (e) => copyToClipboard(e) })
                const colorDiv = createElement('div', { id: 'colorDiv', className: 'mr', style: `background-color: ${rgbToHex(style)}` })
                const description = createElement('p', { id: 'listDesc', textContent: `used ${freq.style.length} time(s)` })
                const containerDiv = createElement('div', { id: 'liContainer' }, colorDiv, listItem, hexDiv, description)
                const rootDiv = document.createElement('div')

                return renderEl(containerDiv, rootDiv)
            },
            createFontElement: function (elObj) {
                // const containerDiv = document.createElement('div')
                // const listItem = document.createElement('div')
                const { freq, style, hightLightFontOnPage } = elObj
                // listItem.textContent = style
                // listItem.value = freq.id
                // listItem.className = 'pointer'
                // listItem.addEventListener('click', hightLightFontOnPage)
                // containerDiv.appendChild(listItem)
                const listItem = createElement('div', { className: 'pointer', value: freq.id, textContent: style, onclick: e => hightLightFontOnPage(e) })
                const containerDiv = createElement('div', { id: 'liContainer' }, listItem)
                const rootDiv = document.createElement('div')
                return renderEl(containerDiv, rootDiv)
            },
            createDefaultElement: function (elObj) {
                // const containerDiv = document.createElement('div')
                // const listItem = document.createElement('div')
                const { style } = elObj
                // listItem.textContent = style
                // return listItem
                const listItem = createElement('div', { textContent: style })
                const containerDiv = createElement('div', { id: 'liContainer' }, listItem)
                const rootDiv = document.createElement('div')
                return renderEl(containerDiv, rootDiv)
            }
        }
    }
}())
