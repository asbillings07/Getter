/* global chrome MutationObserver */
import { createElementType } from '../utils/createElement.js'
import { rgbToHex, getCurrentTab, inspectDomForChanges, createNotification, copyToClipboard, downloadImage } from '../utils/helperFunctions.js';
import "regenerator-runtime/runtime.js";

const anchor = document.getElementById('main')
const spinner = document.getElementById('spinner')
inspectDomForChanges(anchor, spinner)

const getProperName = (cssName) =>
({
  backgroundColor: 'Background Color',
  color: 'Color',
  fontFamily: 'Font Family',
  fontWeight: 'Font Weight',
  fontSize: 'Font Size',
  imageSource: 'Image Source',
  backgroundImage: 'Background Image'
}[cssName])

let currentTab = await getCurrentTab()

onTabQuery(currentTab)

chrome.runtime.onMessage.addListener(onMessage)

function createView (cssObj) {
  for (const type in cssObj) {
    let sortedObjArr
    if (type === 'imageSource') {
      sortedObjArr = Object.entries(cssObj[type]).filter(([key, value]) => key === 'images')
    } else {
      sortedObjArr = Object.entries(cssObj[type]).sort((a, b) => {
        return a[1].style.length === b[1].style.length
          ? 0
          : a[1].style.length > b[1].style.length
            ? -1
            : 1
      })
    }

    anchor.appendChild(createViewElements(type, sortedObjArr))
  }
}

function createViewElements (name, arr) {
  const title = document.createElement('h3')
  title.textContent = `${getProperName(name)}(s) used on page`
  const orderedList = document.createElement('ul')
  arr.forEach((prop) => {
    const createdListEl = createElementsByProp(name, prop)
    orderedList.appendChild(createdListEl)
  })
  orderedList.prepend(title)
  anchor.style.width = '420px'
  return orderedList
}

function createElementsByProp (name, prop) {
  const [style, freq] = prop
  const elementProps = {
    freq, style, rgbToHex, copyToClipboard, hightLightFontOnPage, downloadImage
  }
  return createElementType(name, { ...elementProps })
}

function hightLightFontOnPage (e) {
  console.log('Is this actually working????', e.target.value)
  chrome.tabs.sendMessage(
    currentTab.id,
    { styleId: `${e.target.value}` },
    function (response) {
      console.log('****Message Response****', response);
    }
  )
}

function onMessage (request, _sender, _sendResponse) {
  switch (request.action) {
    case 'getState':
      createView(request.payload)
      break
    case 'getNotif':
      createNotification({ title: request.payload.title, message: request.payload.message })
      break
    case 'getCurrentResults':
      createView(request.payload)
      break
    default:
      break
  }
}



function onTabQuery (tab) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id, },
    files: ['crawlPage.js']
  })
}

