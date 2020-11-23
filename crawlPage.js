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

  function getStyleOnPage(css, pseudoEl) {
    if (typeof window.getComputedStyle == "undefined")
      window.getComputedStyle = function (elem) {
        return elem.currentStyle;
      };
    const nodes = document.body.getElementsByTagName("*");
    const values = [];
    Array.from(nodes).forEach((nodeElement, i) => {
      if (nodeElement.style) {
        captureEls({ css, nodeElement, values });
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

  function captureEls(elementInfo) {
    const { css, nodeElement, values } = elementInfo;
    const outputElement = "#" + (nodeElement.id || nodeElement.nodeName);

    let elementStyle;
    if (css == "fontFamily") {
      const fontStr = getComputedStyle(nodeElement, "")[css];
      const font = fontStr.split(",")[0];
      if (font.charAt(0) == `"` && font.charAt(font.length - 1) == `"`) {
        elementStyle = font;
      }
    } else {
      elementStyle = getComputedStyle(nodeElement, "")[css];
    }

    if (elementStyle) {
      if (!values.includes(elementStyle)) {
        values.push(elementStyle);
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
