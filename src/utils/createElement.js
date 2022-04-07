/* eslint-disable indent */
import { createElement, renderEl } from './didact.js'

export const createElementType = (type, elObj) => ({
    color: function (elObj) {
        const { freq, style, rgbToHex, copyToClipboard } = elObj
        const listItem = createElement('div', { id: 'listItem', className: 'mr pointer', textContent: style, onclick: (e) => copyToClipboard(e) })
        const hexDiv = createElement('div', { id: 'hexDiv', className: 'mr pointer', textContent: rgbToHex(style), onclick: (e) => copyToClipboard(e) })
        const colorDiv = createElement('div', { id: 'colorDiv', className: 'mr pointer', style: `background-color: ${rgbToHex(style)}`, onclick: (e) => copyToClipboard(e) })
        const description = createElement('p', { id: 'listDesc', textContent: `used ${freq.style.length} time(s)` })
        const containerDiv = createElement('div', { id: 'liContainer' }, colorDiv, listItem, hexDiv, description)
        const rootDiv = document.createElement('div')

        return renderEl(containerDiv, rootDiv)
    },
    backgroundColor: function (elObj) {
        const { freq, style, rgbToHex, copyToClipboard } = elObj
        const listItem = createElement('div', { id: 'listItem', className: 'mr pointer', textContent: style, onclick: (e) => copyToClipboard(e) })
        const hexDiv = createElement('div', { id: 'hexDiv', className: 'mr pointer', textContent: rgbToHex(style), onclick: (e) => copyToClipboard(e) })
        const colorDiv = createElement('div', { id: 'colorDiv', className: 'mr pointer', style: `background-color: ${rgbToHex(style)}`, onclick: (e) => copyToClipboard(e) })
        const description = createElement('p', { id: 'listDesc', textContent: `used ${freq.style.length} time(s)` })
        const containerDiv = createElement('div', { id: 'liContainer' }, colorDiv, listItem, hexDiv, description)
        const rootDiv = document.createElement('div')

        return renderEl(containerDiv, rootDiv)
    },
    fontFamily: function (elObj) {
        const { freq, style, hightLightFontOnPage } = elObj
        const listItem = createElement('div', { id: 'fontItem', className: 'pointer', value: freq.id, textContent: style, onclick: hightLightFontOnPage })
        const containerDiv = createElement('div', { id: 'liContainer' }, listItem)
        const rootDiv = document.createElement('div')
        return renderEl(containerDiv, rootDiv)
    },
    imageSource: function (elObj) {
        const { freq, downloadImage } = elObj

        const imageItems = freq.images.filter(i => i !== 'images').map((image) => {

            const imageDiv = createElement('img', { id: 'imageDiv', className: 'mr pointer', src: `${image.single.src}`, onclick: (e) => downloadImage(e, image.single.src) })
            const description = createElement('p', { id: 'imageDesc', textContent: `${image.single.name}` })
            const container = createElement('div', { className: 'container' }, imageDiv, description)
            return createElement('div', {}, container)
        })
        const rootDiv = document.createElement('div')
        const containerDiv = createElement('div', { id: 'liContainer', className: 'mr pointer' }, imageItems)

        return renderEl(containerDiv, rootDiv)
    },
    backgroundImage: function (elObj) {
        const { freq, downloadImage } = elObj

        const imageDiv = createElement('img', { id: 'bgDiv', className: 'mr pointer', style: `background-image: ${freq.style[0]}`, onclick: (e) => downloadImage(e, freq.style[0]) })
        const description = createElement('p', { id: 'listDesc', textContent: '' })
        const containerDiv = createElement('div', { id: 'liContainer' }, imageDiv, description)
        const rootDiv = document.createElement('div')

        return renderEl(containerDiv, rootDiv)
    },
    default: function (elObj) {

        const { style } = elObj

        const listItem = createElement('div', { textContent: style })
        const containerDiv = createElement('div', { id: 'liContainer' }, listItem)
        const rootDiv = document.createElement('div')
        return renderEl(containerDiv, rootDiv)
    }
}[type](elObj))

