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

  let tab;

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
      getItem('cssGetterOptions', ({ cssGetterOptions }) => {
        options = cssGetterOptions
        getValuesFromPage(getStylesOnPage)
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

  function getValuesFromPage(getStyleOnPage) {
    const styleObj = getStyleOnPage()
    if (!isObjEmpty(styleObj)) {
      console.log('STYLE OBJ', styleObj)
      chrome.runtime.sendMessage({ action: 'getState', payload: styleObj })
      setItem({ hasScriptRunOnPage: true })
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
        console.log('NODES', nodes)

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

    // const backgroundImage = getComputedStyle(nodeElement, '')['background-image'].includes('url') ? getComputedStyle(nodeElement, '')['background-image'] : null
    // consle.log('BG IMAGE', backgroundImage)

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


    allStyles[key][nodeElement.localName] = tagStyles

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
    const shouldAddDimension = options.images.ImageDimensions;
    let image = {
      src: '', 
      name: imageEl.alt
    }

    if (shouldAddDimension) {
      image.height = imageEl.height || imageEl.naturalHeight
      image.width = imageEl.width || imageEl.naturalWidth
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
      return el.id
    } else {
      el.id = createNodeId(5)
      return el.id
    }
  }

  function convertRgb(option, rgb) {
    return {
      'hex' : rgbToHex(rgb),
      'hsl': rgbToHsl(rgb)
    }[option]
  }

  function rgbToHex(rgbStr) {
    const rgbArr = rgbStr.split('(')[1].split(')').join('').split(',') ?? [];
    if (rgbArr.length === 4) rgbArr.pop();

    const hexConvert = rgbArr
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
    return `#${hexConvert}`;
  }

  /**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
  function rgbToHsl(rgbStr) {
    const rgbArr = rgbStr.split('(')[1].split(')').join('').split(',') ?? [];
    let r = rgbArr[0], g = rgbArr[1], b = rgbArr[2];

    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
      h = s = 0; // achromatic
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    return `hsl(${h} ${s} ${l})`
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
