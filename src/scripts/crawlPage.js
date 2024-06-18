/* global chrome, getComputedStyle  */

export function crawlPage() {

  const filterFonts = new Set([
    '-apple-system',
    "Apple Color Emoji",
    'BlinkMacSystemFont',
    'system-ui',
    'System-ui',
    'inherit',
    'initial',
    'unset'
  ]);

  const isObjEmpty = (obj) => {
    if (obj === null || obj === undefined) return true

    return Object.entries(obj).length === 0;
  }

  let options = {}

  const allStyles = {};

  const defaultFontStyles = [
    'fontFamily',
    'fontWeight',
    'fontSize',
    'textSize',
    'lineHeight',
    'letterSpacing',
    'color',
    'backgroundColor',
  ]

  const defaultElementTags = [
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
  ]

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
      getValuesFromPage(getStylesOnPage)
    }
  })


  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.action === 'styleHighlight') {
      highLightFontOnPage(request.payload.styleId)
      sendResponse({ action: 'highLightNotif', payload: { title: 'Font Highlighted', message: 'The selected Font has been highlighted in the page' } })
    }
  })

  function highLightFontOnPage (styleId) {

    // .getter-highlight {
    //   border: 16px solid #ea2634;
    //   border - radius: 10px;
    // }
    const allStyleNodes = document.body.querySelectorAll(`[data-style-id`)

    const styleNodes = document.body.querySelectorAll(`[data-style-id="${styleId}"]`)

    // remove previous highlights
    Array.from(allStyleNodes).forEach(node => {
      node.style.border = 'none';
    })

    // add highlight to specified nodes
    Array.from(styleNodes).forEach(node => {
      // node.classList.add('getter-highlight')
      node.style.border = '16px solid #ea2634';
    
    })
  }


  function getValuesFromPage(getStyleOnPage) {
    const styleObj = getStyleOnPage()
    if (!isObjEmpty(styleObj)) {
      chrome.runtime.sendMessage({ action: 'getCurrentResults', payload: styleObj })
      setItem({ hasScriptRunOnPage: true })
      setItem({ currentResults: styleObj })
    }
  }

  function getStylesOnPage(pseudoEl = false) {
    if (typeof window.getComputedStyle === 'undefined') {
      window.getComputedStyle = function (elem) {
        return elem.currentStyle;
      };
    }
    const nodes = Array.from(document.body.querySelectorAll('*'));
    const shouldCapture = () => {
      if (nodes.length > 1000) {
        return true
      }

      if (nodes.length > 500) {
        return true
      }

      if (nodes.length > 100) {
        return true
      }
    }

    if (shouldCapture) {
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
    const { nodeElement, allStyles } = elementInfo;

    if (defaultElementTags.includes(nodeElement.localName)) {
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
      allStyles.colors[color] = { id: getId(nodeElement), count: 1, hex: rgbToHex(color)}
      nodeElement.dataset.styleId = `${allStyles.colors[color].id}`
    }

    if (allStyles.colors[color] !== bgColor) { 
      if (allStyles.colors[bgColor]) {
        allStyles.colors[bgColor].count += 1
      } else {
        allStyles.colors[bgColor] = { id: getId(nodeElement), count: 1, hex: rgbToHex(bgColor)}
        nodeElement.dataset.styleId = `${allStyles.colors[bgColor].id}`
      }
    }
  }

  const handleTagStyles = (allStyles, key, nodeElement) => {
    const tagStyles = {
      id: getId(nodeElement),
    };
    allStyles[key] = allStyles[key] || {}

    defaultFontStyles.forEach(style => {
      const styleVal = getComputedStyle(nodeElement, '')[style]
      if (styleVal) {
        if (style === 'fontFamily') {
          tagStyles[style] = transformFonts(styleVal)
        } else {
          tagStyles[style] = styleVal
        }
      }
    })

    if (allStyles[key][nodeElement.localName]) {
      allStyles[key][nodeElement.localName].push(movePropertyToTop(tagStyles, 'id'))
    } else {
      allStyles[key][nodeElement.localName] = [movePropertyToTop(tagStyles, 'id')]
    }

  }

  function movePropertyToTop(obj, key) {
    // Check if the specified key exists in the object
    if (!obj.hasOwnProperty(key)) {
      console.error(`Key "${key}" does not exist in the object.`);
      return obj;
    }

    if (Object.keys(obj)[0] === key) return obj;

    // Create a new object
    const newObj = {};

    // Add the specified key to the new object first
    newObj[key] = obj[key];

    // Add the rest of the keys
    for (let prop in obj) {
      if (prop !== key) {
        newObj[prop] = obj[prop];
      }
    }

    return newObj;
  }

  function toCapitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  const transformFonts = (fonts) => {
    return fonts.split(',').filter(font => !filterFonts.has(font.trim())).map(font => {
      if (font.includes('_')) {
        return toCapitalize(font.split('_').filter(str => str !== '')[0])
      } else {
        return toCapitalize(font)
      }
    })
    .filter(font => font !== ' ')
    .join(',')
  }

  const handleImages = (allStyles, nodeElement) => {    
    const imageEl = nodeElement;

    if (!imageEl.src && !imageEl.srcset) return

    const image = getImageData(imageEl)

    if (allStyles['images']) {
      allStyles['images'].push(image)
    } else {
      allStyles['images'] = [image]
    }
  }

  function getImageData (imageEl) {
    let image = {
      src: '', 
      name: imageEl.alt
    }
    
    if (imageEl.src) {
      image.src = imageEl.src
    } else if (imageEl.srcset) {
      image.src = imageEl.srcset.split(',')[0].split(' ')[0]
    }

    if (!image.src.includes('http')) {
      getItem('currentTab', ({ currentTab }) => {
        image.src = `${currentTab.url}${image.src}`;
      })
    }

    return image;
  }


  function getId(el) {
    if (el.id) {
      el.setAttribute('data-getter-id', el.id)
      return el.id
    }

    el.id = createNodeId(5)
    el.setAttribute('data-getter-id', el.id)
    return el.id
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


  function rgbToHex(rgbStr) {
    const rgbArr = rgbStr.split('(')[1].split(')').join('').split(',') ?? [];
    if (rgbArr.length === 4) rgbArr.pop();

    const hexValue = rgbArr
      .map((value) => {
        switch (true) {
          case +value < 0:
            return 0;
          case +value > 255:
            return 255;
          default:
            return +value;
        }
      })
      .map((val) => {
        const hexVal = parseInt(val).toString(16).toUpperCase().trim();
        return hexVal.length === 1 ? '0' + hexVal : hexVal;
      })
      .join('');
    return `#${hexValue}`;
  }
}
