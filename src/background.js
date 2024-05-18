/* global chrome  */
import { getItem, setItem, createNotification } from '../utils/helperFunctions'

  const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { schemes: ['https', 'http'] }
      })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }
  let cssValues

  getItem('cssGetters', ({ cssGetters }) => {

    cssValues = cssGetters
  })

  chrome.storage.onChanged.addListener((changes) => {

    if ('cssGetters' in changes && changes.cssGetters.newValue) {
      getItem('cssGetters', ({ cssGetters }) => {
        cssValues = cssGetters
      })
    }
  })

  chrome.webNavigation.onDOMContentLoaded.addListener((object) => {
    setItem({ hasScriptRunOnPage: false })
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
      case 'getValues':
        console.log('GET VALUES', request.payload)
        sendResponse({ getters: cssValues })
        break
      case 'getState':
        console.log('GET STATE', request.payload)
        setItem({
          [sender.tab.url]: request.payload,
          currentResults: request.payload
        })
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
          'color',
          'backgroundColor',
          'images',
          'backgroundImage'
        ]
      })
    })
  })


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

