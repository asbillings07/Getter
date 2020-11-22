(function () {
  const rule1 = {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        css: ["div"],
      }),
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()],
  };
  let css_values;

  setItem({
    hasScriptRunOnPage: false,
    css_getters: [
      "fontFamily",
      "fontWeight",
      "fontSize",
      "backgroundColor",
      "color",
    ],
  });

  getItem("css_getters", ({ css_getters }) => {
    console.log("getters", css_getters);
    css_values = css_getters;
  });

  chrome.storage.onChanged.addListener((changes) => {
    console.log(changes);
  });

  chrome.tabs.onActivated.addListener(function () {
    setItem({ hasScriptRunOnPage: false });
  });

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.log(sender.tab.url);
    console.log(sender);

    // console.log("REQUEST", request);

    if (request.method == "getValues") {
      sendResponse({ getters: css_values });
      // setItem({hasScriptRunOnPage: true})
    }
    if (request.state) {
      console.log(request.state);
      setItem({
        [sender.tab.url]: request.state,
        currentResults: request.state,
      });
    }
  });

  chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      chrome.declarativeContent.onPageChanged.addRules([rule1]);
    });
  });

  function getItem(item, func = (data) => false) {
    chrome.storage.sync.get(item, func);
  }
  function setItem(item, func = () => false) {
    chrome.storage.sync.set(item);
  }
})();
