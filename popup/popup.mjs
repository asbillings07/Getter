/* global chrome MutationObserver */
import createColorElements from '../utils/createElement.mjs'
import helpers from '../utils/helperFunctions.mjs';

(function () {
  const { setItem } = helpers
  const { createColorElement, createImgSrcElement, createBgImageElement, createFontElement, createDefaultElement } = createColorElements()
  const anchor = document.getElementById('main')
  const spinner = document.getElementById('spinner')
  inspectDomForChanges(anchor, spinner)

  const getProperName = (cssName) =>
  ({
    backgroundColor: 'Background Color',
    color: 'Color',
    fontFamily: 'Font Family',
    fontWeight: 'Font Weight',
    fontSize: 'Font Size',
    imageSource: 'Image Source',
    backgroundImage: 'Background Image'
  }[cssName])

  chrome.tabs.query({ active: true, currentWindow: true }, onTabQuery)

  chrome.runtime.onMessage.addListener(onMessage)

  function createView (cssObj) {
    const sortImgs = (a, b) => {
      return a[1].style.length === b[1].style.length
        ? 0
        : a[1].style.length > b[1].style.length
          ? -1
          : 1
    }

    for (const type in cssObj) {
      let sortedObjArr
      if (type === 'imageSource') {
        sortedObjArr = Object.entries(cssObj[type]).filter(([key, value]) => key === 'images')
      } else {
        sortedObjArr = Object.entries(cssObj[type]).sort(sortImgs)
      }

      anchor.appendChild(createViewElements(type, sortedObjArr))
    }
  }

  function createViewElements (name, arr) {
    const title = document.createElement('h3')
    title.textContent = `${getProperName(name)}(s) used on page`
    const orderedList = document.createElement('ul')
    arr.forEach((prop) => {
      const createdListEl = createElementsByProp(name, prop)
      orderedList.appendChild(createdListEl)
    })
    orderedList.prepend(title)
    anchor.style.width = '420px'
    return orderedList
  }

  function createElementsByProp (name, prop) {
    const [style, freq] = prop

    switch (name) {
      case 'backgroundColor':
        return createColorElement({ freq, style, rgbToHex, copyToClipboard })
      case 'color':
        return createColorElement({ freq, style, rgbToHex, copyToClipboard })
      case 'fontFamily':
        return createFontElement({ freq, style, hightLightFontOnPage })
      case 'imageSource':
        return createImgSrcElement({ freq, style, downloadImage })
      case 'backgroundImage':
        return createBgImageElement({ freq, style, downloadImage })
      default:
        return createDefaultElement({ style })
    }
  }

  function hightLightFontOnPage (e) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { styleId: `${e.target.value}` },
        function (response) {
          return
        }
      )
    })
  }

  function rgbToHex (rbgStr) {
    const rgbArr = rbgStr.split('(')[1].split(')').join('').split(',')
    if (rgbArr.length === 4) rgbArr.pop()

    const hexConvert = rgbArr
      .map((value) => {
        switch (true) {
          case +value < 0:
            return 0
          case +value > 255:
            return 255
          default:
            return +value
        }
      })
      .map((val) => {
        const hexVal = parseInt(val).toString(16).toUpperCase().trim()
        return hexVal.length === 1 ? '0' + hexVal : hexVal
      })
      .join('')
    return `#${hexConvert}`
  }

  function createNotification (title, message, buttons, interaction) {
    const options = {
      type: 'basic',
      iconUrl: '../images/CSS-Getter-Icon-16px.png',
      title: title,
      message: message,
      requireInteraction: interaction || false
    }
    if (buttons) {
      options.buttons = buttons
    }
    chrome.notifications.create(options)
  }

  async function copyToClipboard (e) {
    if (!navigator.clipboard) {
      console.error('Clipboard is unavailable')
      return
    }

    let text

    if (e.target.innerText) {
      text = e.target.innerText
    } else {
      text = rgbToHex(e.target.style.backgroundColor)
    }

    try {
      await navigator.clipboard.writeText(text)
      createNotification(
        'Copied to Clipboard!',
        `${text} has been copied to the clipboard.`
      )
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  function downloadImage (e, image) {
    setItem({ currentImage: image })

    const buttons = [{
      title: 'View image'
    }, {
      title: 'Download image'
    }]

    createNotification('Image Notification', 'What would you like to do?', buttons, true)
  }

  function inspectDomForChanges (domEl, domElRemove) {
    const config = { attributes: true, childList: true, subtree: true }
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback)
    // Callback function to execute when mutations are observed
    function callback (mutationsList, obs) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          domElRemove.style.display = 'none'
          obs.disconnect()
        }
      }
    }
    // Start observing the target node for configured mutations
    if (domEl) {
      observer.observe(domEl, config)
    }
  }

  function onMessage (request, sender, sendResponse) {
    switch (request.action) {
      case 'getState':
        createView(request.payload)
        break
      case 'getNotif':
        createNotification(request.payload.title, request.payload.message)
        break
      case 'getCurrentResults':
        createView(request.payload)
        break
      default:
        console.log(request)
    }
  }

  function onTabQuery (tabs) {
    chrome.tabs.executeScript(tabs[0].id, {
      file: 'crawlPage.js'
    })
  }
})()
