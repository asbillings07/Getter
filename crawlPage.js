/* global chrome, getComputedStyle  */
(function () {
  getItem('hasScriptRunOnPage', ({ hasScriptRunOnPage }) => {
    if (hasScriptRunOnPage) {
      console.log('Script has already run, pulling from last result')
      getItem('currentResults', ({ currentResults }) => chrome.runtime.sendMessage({ state: currentResults }))
    } else {
      chrome.runtime.sendMessage({ method: 'getValues' }, (response) => {
        console.log(response)
        getValuesFromPage(response.getters, getStyleOnPage)
      })
    }
  })

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.styleId) {
      highlightInPage(request.styleId)
      sendResponse({ title: 'Font Highlighted', message: 'The selected Font has been highlighted in the page' })
    }
  })

  function getStyleOnPage (css, pseudoEl) {
    if (typeof window.getComputedStyle === 'undefined') {
      window.getComputedStyle = function (elem) {
        return elem.currentStyle
      }
    }
    const nodes = document.body.getElementsByTagName('*')
    const allStyles = {}
    // need to get frequency of used colors
    Array.from(nodes).forEach((nodeElement, i) => {
      if (nodeElement.style) {
        captureEls({ css, nodeElement, allStyles })
        if (pseudoEl) {
          capturePseudoEls({ pseudoEl, css, allStyles, nodeElement })
        }
      }
    })

    return allStyles
  }

  function getValuesFromPage (values, getStyleOnPage) {
    const valueObj = {}
    values.forEach((value) => {
      const styleObj = getStyleOnPage(value)
      if (!isObjEmpty(styleObj)) valueObj[value] = styleObj
    })
    console.log(valueObj)

    chrome.runtime.sendMessage({ state: valueObj })
    setItem({ hasScriptRunOnPage: true })
    return valueObj
  }

  function getItem (item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem (item, func = () => false) {
    chrome.storage.local.set(item)
  }

  function capturePseudoEls (elementInfo) {
    const { pseudoEl, css, allStyles, nodeElement } = elementInfo
    const pseudoProp = getComputedStyle(nodeElement, pseudoEl)[css]

    if (pseudoProp) {
      if (!allStyles.includes(pseudoProp)) {
        console.log(':Before', pseudoProp)
        allStyles.push(pseudoProp)
      }
    }
  }

  function captureEls (elementInfo) {
    const { css, nodeElement, allStyles } = elementInfo
    // const outputElement = '#' + (nodeElement.id || nodeElement.nodeName)

    let elementStyle
    if (css === 'fontFamily') {
      const fontStr = getComputedStyle(nodeElement, '')[css]
      const font = fontStr.split(',')[0]
      if (font.charAt(0) === '"' && font.charAt(font.length - 1) === '"') {
        elementStyle = font
      }
    } else {
      elementStyle = getComputedStyle(nodeElement, '')[css]
    }

    if (elementStyle) {
      if (allStyles[elementStyle]) {
        allStyles[elementStyle].push(elementStyle)
      } else {
        allStyles[elementStyle] = [elementStyle]
      }
      if (!nodeElement.dataset.styleId) {
        nodeElement.dataset.styleId = `${elementStyle}`
      }
      // console.log(`${elementStyle}-${allStyles.indexOf(elementStyle)}`)
      console.log(nodeElement.dataset.styleId)
      console.log(nodeElement)
    }
  }

  function highlightInPage (styleId) {
    const allNodes = document.body.getElementsByTagName('*')
    console.log(`[data-style-id="${styleId}"]`)
    const nodes = document.body.querySelectorAll('[data-style-id="0"]')
    console.log('Queried Nodes', nodes)

    // remove previous highlights
    Array.from(allNodes).forEach(node => {
      node.classList.remove('style-highlight')
    })

    // add highlight to specified nodes
    Array.from(nodes).forEach(node => {
      node.classList.add('style-highlight')
    })
  }

  const sheet = (function () {
    // Create the <style> tag
    const style = document.createElement('style')

    // WebKit hack :(
    style.appendChild(document.createTextNode(''))

    // Add the <style> element to the page
    document.head.appendChild(style)

    return style.sheet
  })()

  function addCSSRule (sheet, selector, rules, index = 0) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index)
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index)
    }
  }

  function isObjEmpty (obj) {
    return Object.keys(obj).length === 0
  }

  addCSSRule(sheet, '.style-highlight', 'background-color: yellow')
})()
