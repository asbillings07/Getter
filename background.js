/* global chrome  */
(function () {
  const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        css: ['div']
      })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }
  let cssValues

  getItem('cssGetters', ({ cssGetters }) => {
    console.log('getters', cssGetters)
    cssValues = cssGetters
  })

  chrome.storage.onChanged.addListener((changes) => {
    console.log(changes)
    if ('cssGetters' in changes && changes.cssGetters.newValue) {
      getItem('cssGetters', ({ cssGetters }) => {
        cssValues = cssGetters
      })
    }
  })

  chrome.webNavigation.onDOMContentLoaded.addListener((object) => {
    setItem({ hasScriptRunOnPage: false })
    // createNotification('Page Has Refreshed', 'Extension results have been updated')
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
    console.log(sender.tab.url)
    console.log(sender)

    // console.log("REQUEST", request);
    switch (request.action) {
      case 'getValues':
        sendResponse({ getters: cssValues })
        break
      case 'getState':
        console.log(request.payload)
        setItem({
          [sender.tab.url]: request.payload,
          currentResults: request.payload
        })
        break
      default:
        console.log(request)
    }
  })

  chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([rule1])
      setItem({
        hasScriptRunOnPage: false,
        pageRefreshed: false,
        cssGetters: [
          'fontFamily',
          'backgroundColor',
          'color'
        ]
      })
    })
  })

  function getItem (item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem (item, func = () => false) {
    chrome.storage.local.set(item)
  }
  function createNotification (title, message) {
    const options = {
      type: 'basic',
      iconUrl: '../images/color_16px.png',
      title: title,
      message: message,
      requireInteraction: false
    }
    chrome.notifications.create(options)
  }
})()
