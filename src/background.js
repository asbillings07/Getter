import { setItem, getItem, getCurrentTab, createNotification } from './utils/helperFunctions.js';
import "regenerator-runtime/runtime.js";

/* global chrome  */
await getCurrentTab()
const rule1 = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ['https', 'http'] }
    })
  ],
  actions: [new chrome.declarativeContent.ShowPageAction()]
}
let cssValues
let filteredElementValues

getItem(null, ({ cssGetters, filteredElements }) => {
  // console.log('getters', cssGetters)
  cssValues = cssGetters
  filteredElementValues = filteredElements
})

async function setCurrentTab () {
  let tab = await getCurrentTab()
  setItem({ currentTab: tab })
}


chrome.storage.onChanged.addListener((changes) => {
  // console.log(changes)
  if ('cssGetters' in changes && changes.cssGetters.newValue) {
    getItem('cssGetters', ({ cssGetters }) => {
      cssValues = cssGetters
    })
  }
  if ('filteredElements' in changes && changes.filteredElements.newValue) {
    getItem('filteredElements', ({ filteredElements }) => {
      filteredElementValues = filteredElements
    })
  }
})

chrome.webNavigation.onDOMContentLoaded.addListener((_object) => {
  setItem({ hasScriptRunOnPage: false })
  // createNotification({ title: 'Page Has Refreshed', message: 'Extension results have been updated' })
})

chrome.tabs.onActivated.addListener(function () {
  // todo need to check if tab or url in current tab changes
  setItem({ hasScriptRunOnPage: false })
})

chrome.runtime.onMessage.addListener(function (
  request,
  sender,
  sendResponse
) {
  switch (request.action) {
    case 'getCSSValues':
      sendResponse({ cssValues })
      break
    case 'setState':
      setItem({
        [sender.tab.url]: request.payload,
        currentResults: request.payload
      })
      break
    case 'getElementValues':
      sendResponse({ filteredElementValues })
      break
    default:
      break
  }
})


chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([rule1])
    setItem({
      hasScriptRunOnPage: false,
      currentImage: null,
      pageRefreshed: false,
      cssGetters: [
        'fontFamily',
        'backgroundColor',
        'color'
      ],
      filteredElements: ['time', 'iframe', 'input', 'br', 'form']
    })
  })
})

// function getItem(item, func = (data) => false) {
//   chrome.storage.local.get(item, func)
// }
// function setItem(item, func = () => false) {
//   chrome.storage.local.set(item)
// }


function onNotifButtonPress (id, buttonIdx) {
  getItem('currentImage', ({ currentImage }) => {
    if (buttonIdx === 0) { // view image
      createLink(currentImage, false, true)
    }

    if (buttonIdx === 1) { // download image
      createLink(currentImage, true, false)
    }
  })
}

function createLink (image, download, view) {
  const a = document.createElement('a')
  if (image.includes('url')) {
    image = image.split('"')[1]
  }

  if (download) {
    chrome.downloads.download({ url: image })
  }

  if (view) {
    a.href = image
    a.target = '_blank'
  }

  const clickHandler = () => null

  a.addEventListener('click', clickHandler, false)
  a.click()
  a.removeEventListener('click', clickHandler)
}

chrome.notifications.onButtonClicked.addListener(onNotifButtonPress)

