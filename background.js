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

  setItem({
    hasScriptRunOnPage: false,
    cssGetters: [
      'fontFamily',
      // 'fontWeight',
      // 'fontSize',
      'backgroundColor',
      'color'
    ]
  })

  getItem('cssGetters', ({ cssGetters }) => {
    console.log('getters', cssGetters)
    cssValues = cssGetters
  })

  chrome.storage.onChanged.addListener((changes) => {
    console.log(changes)
  })

  chrome.tabs.onActivated.addListener(function () {
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

    if (request.method === 'getValues') {
      sendResponse({ getters: cssValues })
      // setItem({hasScriptRunOnPage: true})
    }
    if (request.state) {
      console.log(request.state)
      setItem({
        [sender.tab.url]: request.state,
        currentResults: request.state
      })
    }
  })

  chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([rule1])
    })
  })

  function getItem (item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem (item, func = () => false) {
    chrome.storage.local.set(item)
  }
})()
