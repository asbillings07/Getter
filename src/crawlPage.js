/* global chrome, getComputedStyle  */

export function crawlPage() {

  const filterFonts = new Set([
    'sans-serif',
    'serif',
    'Arial',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'inherit',
    'initial',
    'unset'
  ]);

  const searchNodes = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'button'
  ])

  function getItem(item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem(item, func = () => false) {
    chrome.storage.local.set(item)
  }

  getItem('hasScriptRunOnPage', ({ hasScriptRunOnPage }) => {
    if (hasScriptRunOnPage) {
      getItem('currentResults', ({ currentResults }) => chrome.runtime.sendMessage({ action: 'getCurrentResults', payload: currentResults }))
    } else {
      chrome.runtime.sendMessage({ action: 'getValues', payload: null }, (response) => {
        getValuesFromPage(response.getters, getStylesOnPage)
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
      sendResponse({ action: 'notif', payload: { title: 'Font Highlighted', message: 'The selected Font has been highlighted in the page' } })
    }
  })

  function getStylesOnPage(css, pseudoEl) {
    if (typeof window.getComputedStyle === 'undefined') {
      window.getComputedStyle = function (elem) {
        return elem.currentStyle;
      };
    }
    const nodes = document.body.getElementsByTagName('*');
    const allStyles = {};

    Array.from(nodes).forEach((nodeElement, i) => {
      if (searchNodes.has(nodeElement.localName)) {
        if (nodeElement.style) {
          captureEls({ css, nodeElement, allStyles });
          if (pseudoEl) {
            capturePseudoEls({ pseudoEl, css, allStyles, nodeElement });
          }
        }
      }
    });

    for (const style in allStyles) {
      if (Array.isArray(allStyles[style].style)) {
        // add count to style object
        allStyles[style].count = allStyles[style].style.length

        // remove styles if there isn't an element associated with it
        if (!allStyles[style].nodeElement) {
          delete allStyles[style]
        }
      }

      if (allStyles['images'] && Array.isArray(allStyles['images'].images)) {
        // filter all null values
        allStyles['images'].images = allStyles['images'].images.filter(image => image !== undefined).filter(image => image !== 'images')
      }
    }
    console.log('allStyles', allStyles)
    return allStyles;
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
    const { css, nodeElement, allStyles } = elementInfo;

    let elementStyle
    const imageNames = ['img', 'imageSource', 'backgroundImage']
    if (css === 'fontFamily') {
      elementStyle = getComputedStyle(nodeElement, '')[css].split(',').map(font => font.trim()).filter(font => !filterFonts.has(font))
    } else if (imageNames.includes(css)) {
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

    createStyleArray(allStyles, elementStyle, nodeElement);
    addNodeElement(allStyles, elementStyle, nodeElement)
  }

  function captureImageSrc(imageEl) {
    if (!imageEl.src && !imageEl.srcset) return

    const imageInfo = {}

    if (imageEl.srcset) {
      imageInfo.multiple = { src: imageEl.srcset.split(','), name: imageEl.alt }
    }

    if (imageEl.src) {
      imageInfo.single = { src: imageEl.src, name: imageEl.alt }
    }

    return imageInfo
  }

  const addNodeElement = (styles, elementStyle, element) => {
    if (!styles[elementStyle]) return

    if (styles[elementStyle].nodeElement) {
      styles[elementStyle].nodeElement.add(element.localName)
    } else {
      styles[elementStyle].nodeElement = new Set([element.localName])
    }
  }

  function createStyleArray(allStyles, elementStyle, nodeElement) {
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
          // console.log('allStyles[elementStyle].style', allStyles[elementStyle].style)
        } else if (Array.isArray(elementStyle)) {
          elementStyle.forEach(el => {
            allStyles[el] = { style: [el], id: getId(nodeElement) }
            nodeElement.dataset.styleId = `${allStyles[el].id}`
          })
          // console.log('allStyles isARRAY', elementStyle)
        } else {
          allStyles[elementStyle] = { style: [elementStyle], id: getId(nodeElement) }
          nodeElement.dataset.styleId = `${allStyles[elementStyle].id}`
          // console.log('allStyles isNOTARRAY', allStyles[elementStyle].style.length)
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

  function addCSSRule(sheet, selector, rules, index = 0) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index)
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index)
    }
  }

  function isObjEmpty(obj) {
    return Object.keys(obj).length === 0
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

  addCSSRule(sheet, '.style-highlight', 'background-color: yellow')
}
