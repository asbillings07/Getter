/* global chrome */
import createStore from "./store.mjs";
import reducer from "./reducer.mjs";

(function () {
  console.log(createStore);
  console.log(reducer);
  const anchor = document.getElementById("main");
  const getProperName = (cssName) =>
    ({
      backgroundColor: "Background Color",
      color: "Color",
      fontFamily: "Font Family",
      fontWeight: "Font Weight",
      fontSize: "Font Size",
    }[cssName]);

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.executeScript(tabs[0].id, {
      file: "crawlPage.js",
    });
  });

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.state) {
      console.log(request.state);
      createView(request.state);
    }
  });

  function createView(cssObj) {
    console.log(cssObj);
    for (const type in cssObj) {
      const sortedObjArr = Object.entries(cssObj[type]).sort((a, b) => {
        return a[1].length === b[1].length
          ? 0
          : a[1].length > b[1].length
          ? -1
          : 1;
      });
      anchor.appendChild(createElements(type, sortedObjArr));
    }
  }

  function createElements(name, arr) {
    const title = document.createElement("h4");
    title.textContent = `${getProperName(name)}(s) used on page`;
    const orderedList = document.createElement("ul");
    arr.forEach((prop) => {
      const createdListEl = createElementsByProp(name, prop);
      orderedList.appendChild(createdListEl);
    });
    orderedList.prepend(title);
    return orderedList;
  }

  function createElementsByProp(name, prop) {
    const [style, freq] = prop;

    const containerDiv = document.createElement("div");
    const listItem = document.createElement("button");
    const colorDiv = document.createElement("div");
    const description = document.createElement("p");
    containerDiv.id = "liContainer";

    if (name === "backgroundColor" || name === "color") {
      containerDiv.id = "liContainer";
      colorDiv.id = "colorDiv";
      colorDiv.style.backgroundColor = style;

      listItem.textContent = `${style}`;
      listItem.addEventListener("click", copyToClipboard);

      description.id = "listDesc";
      description.textContent = `used ${freq.length} time(s) on the page`;

      containerDiv.appendChild(colorDiv);
      containerDiv.appendChild(listItem);
      containerDiv.appendChild(description);

      return containerDiv;
    } else if (name === "fontFamily") {
      listItem.textContent = style;
      listItem.style.fontFamily = style;
      listItem.addEventListener("click", hightLightFontOnPage);
      containerDiv.appendChild(listItem);
      return containerDiv;
    } else {
      listItem.textContent = style;
      return listItem;
    }
  }

  function hightLightFontOnPage(e) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { styleId: `${e.target.innerText}-div#header` },
        function (response) {
          console.log(response);
        }
      );
    });
  }

  function createNotification(title, message) {
    const options = {
      type: "basic",
      iconUrl: "../images/color_16px.png",
      title: title,
      message: message,
      requireInteraction: false,
    };
    chrome.notifications.create(options);
  }

  async function copyToClipboard(e) {
    if (!navigator.clipboard) {
      console.error("Clipboard is unavailable");
      return;
    }
    const text = e.target.innerText;
    try {
      await navigator.clipboard.writeText(text);
      createNotification(
        "Copied to Clipboard!",
        `${text} has been copied to the clipboard.`
      );
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  }

  function getItem(item, func = (data) => console.log(data)) {
    chrome.storage.sync.get(item, func);
  }

  // function setItem (item, func = () => false) {
  //   chrome.storage.sync.set(item)
  // }
})();
