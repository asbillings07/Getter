const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        css: ['div']
      })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }

  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
                  "from a content script:" + sender.tab.url :
                  "from the extension");
    //   if (request.greeting == "hello")
    //     sendResponse({farewell: "goodbye"});
    // console.log('SENDER', sender)
    console.log('REQUEST', request)
    });

  chrome.runtime.onInstalled.addListener(function () {
    setItem({
      state: {
          colors: true,
          fonts: true,
          fontWeights: true,
          fontFamily: true
      }
    })
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([rule1])
    })
  })


  function getItem(item, func = (data) => console.log(data)) {
    chrome.storage.sync.get(item, func)
  }
function setItem(item, func = () => false) {
    chrome.storage.sync.set(item)
  }