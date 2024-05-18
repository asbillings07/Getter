/* global chrome, getComputedStyle  */

export function crawlPage() {

  const getterStyles = new Set([
    'fontFamily',
    'fontWeight',
    'fontSize',
    'textSize',
    'lineHeight',
    'letterSpacing',
    'color',
    'backgroundColor',
  ])

  const elementTags = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'nav',
    'body',
    'section',
    'article',
    'nav',
    'aside',
    'main',
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

  function getValuesFromPage(values, getStyleOnPage) {
    const styleObj = getStyleOnPage()
    // console.log('STYLE OBJ', styleObj)
    chrome.runtime.sendMessage({ action: 'getState', payload: styleObj })
    setItem({ hasScriptRunOnPage: true })
  }

  function getStylesOnPage(pseudoEl = false) {
    if (typeof window.getComputedStyle === 'undefined') {
      window.getComputedStyle = function (elem) {
        return elem.currentStyle;
      };
    }
    const nodes = document.body.getElementsByTagName('*');
    const allStyles = {};

    Array.from(nodes).forEach((nodeElement, i) => {
      if (nodeElement.style) {
        captureEls({ nodeElement, allStyles });
        if (pseudoEl) {
          capturePseudoEls({ pseudoEl, allStyles, nodeElement });
        }
      }
    });

    return allStyles;
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

    if (elementTags.has(nodeElement.localName)) {
      handleTagStyles(allStyles, 'fonts', nodeElement)
    }

    if (nodeElement.localName === 'img') {
      handleImages(allStyles, nodeElement)
    }
      
    handleColors(allStyles, nodeElement)
  }

  const handleColors = (allStyles, nodeElement) => {
    allStyles['colors'] = allStyles['colors'] || {}


    const color = getComputedStyle(nodeElement, '')['color']
    const bgColor = getComputedStyle(nodeElement, '')['backgroundColor']

    if (allStyles.colors[color]) {
      allStyles.colors[color].count += 1
    } else {
      allStyles.colors[color] = { id: getId(nodeElement), count: 1 }
      nodeElement.dataset.styleId = `${allStyles.colors[color].id}`
    }

    if (allStyles.colors[color] !== bgColor) { 
      if (allStyles.colors[bgColor]) {
        allStyles.colors[bgColor].count += 1
      } else {
        allStyles.colors[bgColor] = { id: getId(nodeElement), count: 1 }
        nodeElement.dataset.styleId = `${allStyles.colors[bgColor].id}`
      }
    }
  }

  const handleTagStyles = (allStyles, key, nodeElement) => {
    const tagStyles = {
      id: getId(nodeElement),
    };
    allStyles[key] = allStyles[key] || {}

    getterStyles.forEach(style => {
      if (getComputedStyle(nodeElement, '')[style]) {
        tagStyles[style] = getComputedStyle(nodeElement, '')[style]
      }
    })


    allStyles[key][nodeElement.localName] = tagStyles

  }

  const handleImages = (allStyles, nodeElement) => {
    let image;
    const imageEl = nodeElement;

    if (!imageEl.src && !imageEl.srcset) return

    if (imageEl.srcset) {
      image = { src: imageEl.srcset.split(',')[0].split(' ')[0], name: imageEl.alt }
    } else if (imageEl.src) {
      image = { src: imageEl.src, name: imageEl.alt }
    }


    if (allStyles['images']) {
      allStyles['images'].push(image)
    } else {
      allStyles['images'] = [image]
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
