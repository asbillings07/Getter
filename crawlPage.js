/* global chrome, getComputedStyle  */
(function () {
  let hasScriptRun
  let cssValues
  // grab all initial state in the beginning
  getItem(null, (data) => {
    console.log('local storage data', data)
    const { hasScriptRunOnPage } = data
    hasScriptRun = hasScriptRunOnPage
  })
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
      // todo - I should make this list part of the options.
      const filteredNodes = ['img', 'time', 'iframe', 'input', 'br', 'form']
      if (!filteredNodes.includes(nodeElement.localName)) {
        if (nodeElement.style) {
          captureEls({ css, nodeElement, allStyles })
          if (pseudoEl) {
            capturePseudoEls({ pseudoEl, css, allStyles, nodeElement })
          }
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
    const filterFonts = new Set(['sans-serif', 'serif', 'Arial'])
    // const outputElement = '#' + (nodeElement.id || nodeElement.nodeName)

    let elementStyle
    if (css === 'fontFamily') {
      elementStyle = getComputedStyle(nodeElement, '')[css].split(',').map(font => font.trim()).filter(font => !filterFonts.has(font))
    } else {
      elementStyle = getComputedStyle(nodeElement, '')[css]
    }

    if (elementStyle) {
      if (allStyles[elementStyle]) {
        allStyles[elementStyle].style.push(elementStyle)
      } else if (Array.isArray(elementStyle)) {
        elementStyle.forEach(el => {
          allStyles[el] = { style: [el], id: getId(nodeElement) }
          nodeElement.dataset.styleId = `${allStyles[el].id}`
        })
      } else {
        allStyles[elementStyle] = { style: [elementStyle], id: getId(nodeElement) }
        nodeElement.dataset.styleId = `${allStyles[elementStyle].id}`
      }

      // if (!nodeElement.dataset.styleId) {
      //   nodeElement.dataset.styleId = `${nodeElement.id}`
      // }
      // console.log([nodeElement, `${nodeElement.dataset.styleId}`])
      // console.log(nodeElement.dataset.styleId)
      // console.log(nodeElement)
    }
  }

  function getId (el) {
    if (el.id) {
      return el.id
    } else {
      el.id = createNodeId(5)
      return el.id
    }
  }

  function highlightInPage (styleId) {
    const allNodes = document.body.getElementsByTagName('*')
    console.log(`[data-style-id="${styleId}"]`)
    const nodes = document.body.querySelectorAll(`[data-style-id="${styleId}"]`)
    console.log('Queried Nodes', nodes)

    // remove previous highlights
    Array.from(allNodes).forEach(node => {
      // node.classList.remove('style-highlight')
      node.style.backgroundColor = ''
    })

    // add highlight to specified nodes
    Array.from(nodes).forEach(node => {
      // node.classList.add('style-highlight')
      node.style.backgroundColor = '#FFAE42'
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

  function createNodeId (length) {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const charactersLength = characters.length
    for (let i = 0;i < length;i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }

  addCSSRule(sheet, '.style-highlight', 'background-color: yellow')
})()
