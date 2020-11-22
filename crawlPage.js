(function () {
  getItem("hasScriptRunOnPage", ({ hasScriptRunOnPage }) => {
    if (hasScriptRunOnPage) {
      console.log("Script has already run, pulling from last result");
    } else {
      chrome.runtime.sendMessage({ method: "getValues" }, (response) => {
        console.log(response);
        getValuesFromPage(response.getters, getStyleOnPage);
      });
    }
  });

  function getStyleOnPage(css, pseudoEl = ":before") {
    if (typeof window.getComputedStyle == "undefined")
      window.getComputedStyle = function (elem) {
        return elem.currentStyle;
      };
    const nodes = document.body.getElementsByTagName("*");
    const values = [];
    let elementStyle;
    Array.from(nodes).forEach((nodeElement, i) => {
      if (nodeElement.style) {
        const outputElement =
          "#" + (nodeElement.id || nodeElement.nodeName + "(" + i + ")");

        if (css == "fontFamily") {
          const fontStr = getComputedStyle(nodeElement, "")[css];
          const fontArr = fontStr.split(",");
          elementStyle = fontArr[0];
        } else {
          elementStyle = getComputedStyle(nodeElement, "")[css];
        }

        if (elementStyle) {
          if (!values.includes(elementStyle)) {
            values.push(elementStyle);
          }
        }
        if (pseudoEl) {
          capturePseudoEls({ pseudoEl, css, values, nodeElement });
        }
      }
    });

    return values;
  }

  function getValuesFromPage(values, getStyleOnPage) {
    const valueObj = {};
    values.forEach((value) => {
      valueObj[value] = getStyleOnPage(value);
    });

    chrome.runtime.sendMessage({ state: valueObj });
    setItem({ hasScriptRunOnPage: true });
    return valueObj;
  }

  function getItem(item, func = (data) => false) {
    chrome.storage.sync.get(item, func);
  }
  function setItem(item, func = () => false) {
    chrome.storage.sync.set(item);
  }

  function capturePseudoEls(elementInfo) {
    const { pseudoEl, css, values, nodeElement } = elementInfo;
    const pseudoProp = getComputedStyle(nodeElement, pseudoEl)[css];

    if (pseudoProp) {
      if (!values.includes(pseudoProp)) {
        console.log(":Before", pseudoProp);
        values.push(pseudoProp);
      }
    }
  }

  // function getAllCss() {
  //     var file = document.getElementById('css');
  //     console.log(file.sheet.cssRules)
  //     return Array.prototype.map.call(file.sheet.cssRules, (file) => file.cssText)
  // }

  // getAllCss()
})();
