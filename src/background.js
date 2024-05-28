/* global chrome  */
import { getItem, setItem, createNotification } from './utils/helperFunctions'


const fontStyles = [
  'fontFamily',
  'fontWeight',
  'fontSize',
  'textSize',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
]

const elementTags = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'nav',
  'body',
  'section',
  'article',
  'nav',
  'aside',
  'main',
  'p',
  'button'
]

  const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { schemes: ['https', 'http'] }
      })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }


  // chrome.storage.onChanged.addListener((changes) => {

  //   if ('cssGetterOptions' in changes && changes.cssGetterOptions.newValue) {
  //     getItem('cssGetterOptions', ({ cssGetterOptions }) => {
  //       getterOptions = cssGetterOptions
  //     })
  //   }
  // })

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
      case 'getOptions':
        sendResponse({ cssGetterOptions: getterOptions })
        break
      case 'getState':
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
    chrome.declarativeContent.onPageChanged.removeRules(undefined, async function () {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.declarativeContent.onPageChanged.addRules([rule1])
      setItem({
        hasScriptRunOnPage: false,
        currentImage: null,
        currentTab: tab,
        pageRefreshed: false,
        cssGetterOptions: {
          fonts: {
            fontFamily: true,
            fontWeight: true,
            fontSize: true,
            letterSpacing: true,
            lineHeight: true,
          },
          colors: {
            hex: true,
            buttonColor: true
          },
          images: {
            fileSize: true,
            imageDimensions: true
          }
        }
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

