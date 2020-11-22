(function () {
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
    chrome.tabs.executeScript(
      tabs[0].id,
      {
        file: "crawlPage.js",
      },
      () => {
        getItem("currentResults", ({ currentResults }) => {
          console.log(currentResults);
          createView(currentResults, createElements);
        });
      }
    );
  });

  function createView(cssObj, createElements) {
    for (type in cssObj) {
      anchor.appendChild(createElements(type, cssObj[type]));
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
    if (name == "backgroundColor" || name == "color") {
      let containerDiv = document.createElement("div");
      let listItem = document.createElement("button");
      let listDiv = document.createElement("div");

      containerDiv.id = "liContainer";
      listDiv.id = "listDiv";
      listDiv.style.backgroundColor = prop;
      listItem.textContent = prop;
      containerDiv.appendChild(listDiv);
      containerDiv.appendChild(listItem);
      return containerDiv;
    } else {
      let listItem = document.createElement("button");
      listItem.textContent = prop;
      return listItem;
    }
  }

  function getItem(item, func = (data) => console.log(data)) {
    chrome.storage.sync.get(item, func);
  }
  function setItem(item, func = () => false) {
    chrome.storage.sync.set(item);
  }
})();
