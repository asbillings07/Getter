/* global chrome  */
import { setItem } from './utils/helperFunctions'

  const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { 
          schemes: ['https', 'http']
        }
      })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }

  chrome.webNavigation.onDOMContentLoaded.addListener((object) => {
    setItem({ hasScriptRunOnPage: false })
  })

  const checkTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isRestricted = (tab?.url.includes('chrome:') || tab?.url.includes('chromewebstore'));

    if (isRestricted) {
      chrome.action.disable(tab.id)
    }
  }

  chrome.tabs.onActivated.addListener(() => {
    checkTab()
    setItem({ hasScriptRunOnPage: false })
  })


  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    checkTab()
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
    chrome.action.disable()
    chrome.declarativeContent.onPageChanged.removeRules(undefined, async function () {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.declarativeContent.onPageChanged.addRules([rule1])
      checkTab()
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
            detailed: false
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