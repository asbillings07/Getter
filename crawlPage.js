/* global chrome, getComputedStyle  */
(async function () {
  let hasScriptRun
  let cssValues
  let tab
  // grab all initial state in the beginning
  getItem('currentTab', ({ currentTab }) => {
    if (currentTab) {
      tab = currentTab
    }
  })
  getItem('hasScriptRunOnPage', ({ hasScriptRunOnPage }) => {
    if (hasScriptRunOnPage) {
      getItem('currentResults', ({ currentResults }) => chrome.runtime.sendMessage({ action: 'getCurrentResults', payload: currentResults }))
    } else {
      chrome.runtime.sendMessage({ action: 'getValues', payload: null }, (response) => {
        getValuesFromPage(response.getters, getStyleOnPage)
      })
    }
  })

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.log('Is this message coming through?', request)
    if (request.styleId) {
      highlightInPage(request.styleId)
      sendResponse({ action: 'notif', payload: { title: 'Font Highlighted', message: 'The selected Font has been highlighted in the page' } })
    }
  })

  function getStyleOnPage(css, pseudoEl) {
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
      const filteredNodes = ['time', 'iframe', 'input', 'br', 'form']
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

  function getValuesFromPage(values, getStyleOnPage) {
    const valueObj = {}
    values.forEach((value) => {
      const styleObj = getStyleOnPage(value)
      if (!isObjEmpty(styleObj)) valueObj[value] = styleObj
    })
    chrome.runtime.sendMessage({ action: 'getState', payload: valueObj })
    setItem({ hasScriptRunOnPage: true })
    return valueObj
  }



  function capturePseudoEls(elementInfo) {
    const { pseudoEl, css, allStyles, nodeElement } = elementInfo
    const pseudoProp = getComputedStyle(nodeElement, pseudoEl)[css]

    if (pseudoProp) {
      if (!allStyles.includes(pseudoProp)) {
        allStyles.push(pseudoProp)
      }
    }
  }

  function captureEls(elementInfo) {
    const { css, nodeElement, allStyles } = elementInfo
    const filterFonts = new Set(['sans-serif', 'serif', 'Arial'])

    let elementStyle
    if (css === 'fontFamily') {
      console.log(nodeElement)
      if (nodeElement.textContent) {
        elementStyle = getComputedStyle(nodeElement, '')[css].split(',').map(font => font.trim()).filter(font => !filterFonts.has(font))
      } else {
        elementStyle = 'none'
      }
    } else if (css === 'imageSource' && nodeElement.localName === 'img') {
      elementStyle = 'images'
    } else if (css === 'backgroundImage') {
      const bgStyle = getComputedStyle(nodeElement, '')[css]
      if (bgStyle.includes('url')) {
        elementStyle = bgStyle
      } else {
        elementStyle = 'none'
      }

    } else {
      elementStyle = getComputedStyle(nodeElement, '')[css]
    }

    createStyleArray(allStyles, elementStyle, nodeElement)
  }

  function captureImageSrc(imageEl) {
    const imageInfo = {}

    if (imageEl.srcset) {
      imageInfo.multiple = { src: imageEl.srcset.split(','), name: imageEl.alt }
    }

    if (imageEl.src) {
      imageInfo.single = { src: imageEl.src, name: imageEl.alt }
    }

    return imageInfo
  }

  function createStyleArray(allStyles, elementStyle, nodeElement) {
    console.log('styles...', elementStyle)
    switch (elementStyle) {
      case 'images':
        if (allStyles[elementStyle]) {
          allStyles[elementStyle].images.push(captureImageSrc(nodeElement))
        } else {
          allStyles[elementStyle] = { images: [elementStyle], id: getId(nodeElement) }
          nodeElement.dataset.styleId = `${allStyles[elementStyle].id}`
        }
        break
      case 'none':
        break
      default:
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
    }
  }

  function getId(el) {
    if (el.id) {
      return el.id
    } else {
      el.id = createNodeId(5)
      return el.id
    }
  }

  function highlightInPage(styleId) {
    const allNodes = document.body.getElementsByTagName('*')

    const nodes = document.body.querySelectorAll(`[data-style-id="${styleId}"]`)

    // remove previous highlights
    Array.from(nodes).forEach(node => {
      // we want to ensure there's text in the node
      if (node.classList.contains('style-highlight')) {
        // node.style.backgroundColor = ''
        node.classList.remove('style-highlight')
      } else {
        node.classList.add('style-highlight')
        node.style.backgroundColor = 'red'
      }
    })

    // add highlight to specified nodes
    // Array.from(nodes).forEach(node => {
    //   if (node.classList.includes(style))
    //     node.classList.add('style-highlight')
    //   // node.style.backgroundColor = '#FFAE42'
    // })
  }

  // const sheet = (function () {
  //   // Create the <style> tag
  //   const style = document.createElement('style')

  //   // WebKit hack :(
  //   style.appendChild(document.createTextNode(''))

  //   // Add the <style> element to the page
  //   document.head.appendChild(style)

  //   return style.sheet
  // })()

  // function addCSSRule(sheet, selector, rules, index = 0) {
  //   if ('insertRule' in sheet) {
  //     sheet.insertRule(selector + '{' + rules + '}', index)
  //   } else if ('addRule' in sheet) {
  //     sheet.addRule(selector, rules, index)
  //   }
  // }

  /**
    Utils
   */



  function getItem(item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem(item, func = () => false) {
    chrome.storage.local.set(item)
  }

  function isObjEmpty(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  function createNodeId(length) {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }

  const css = '.style-highlight { background-color: red; }';
  chrome.scripting.insertCSS({
    target: { tabId: currentTab.id },
    css: css,
  });

  // addCSSRule(sheet, '.style-highlight', 'background-color: yellow')
})()
