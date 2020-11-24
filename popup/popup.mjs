/* global chrome MutationObserver */

(function () {
  const anchor = document.getElementById('main')
  const spinner = document.getElementById('spinner')
  inspectDomForChanges(anchor, spinner)

  const getProperName = (cssName) =>
  ({
    backgroundColor: 'Background Color',
    color: 'Color',
    fontFamily: 'Font Family',
    fontWeight: 'Font Weight',
    fontSize: 'Font Size'
  }[cssName])

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.executeScript(tabs[0].id, {
      file: 'crawlPage.js'
    })
  })

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.state) {
      console.log(request.state)
      createView(request.state)
    }
  })

  function createView (cssObj) {
    console.log(cssObj)
    for (const type in cssObj) {
      const sortedObjArr = Object.entries(cssObj[type]).sort((a, b) => {
        return a[1].style.length === b[1].style.length
          ? 0
          : a[1].style.length > b[1].style.length
            ? -1
            : 1
      })
      console.log(sortedObjArr)
      anchor.appendChild(createElements(type, sortedObjArr))
    }
  }

  function createElements (name, arr) {
    const title = document.createElement('h4')
    title.textContent = `${getProperName(name)}(s) used on page`
    const orderedList = document.createElement('ul')
    arr.forEach((prop) => {
      const createdListEl = createElementsByProp(name, prop)
      orderedList.appendChild(createdListEl)
    })
    orderedList.prepend(title)
    anchor.style.width = '500px'
    anchor.style.width = '500px'
    return orderedList
  }

  function createElementsByProp (name, prop) {
    const [style, freq] = prop

    const containerDiv = document.createElement('div')
    const listItem = document.createElement('div')
    const colorDiv = document.createElement('div')
    const hexDiv = document.createElement('div')
    const description = document.createElement('p')
    containerDiv.id = 'liContainer'

    if (name === 'backgroundColor' || name === 'color') {
      containerDiv.id = 'liContainer'
      colorDiv.id = 'colorDiv'
      colorDiv.className = 'mr'
      listItem.className = 'mr pointer'
      hexDiv.className = 'mr pointer'
      colorDiv.style.backgroundColor = rgbToHex(style)
      hexDiv.textContent = rgbToHex(style)
      hexDiv.addEventListener('click', copyToClipboard)
      listItem.textContent = `${style}`
      listItem.addEventListener('click', copyToClipboard)

      description.id = 'listDesc'
      description.textContent = `used ${freq.style.length} time(s) on the page`

      containerDiv.appendChild(colorDiv)
      containerDiv.appendChild(listItem)
      containerDiv.appendChild(hexDiv)
      containerDiv.appendChild(description)

      return containerDiv
    } else if (name === 'fontFamily') {
      listItem.textContent = style
      listItem.value = freq.id
      listItem.className = 'pointer'
      listItem.style.fontFamily = style
      listItem.addEventListener('click', hightLightFontOnPage)
      containerDiv.appendChild(listItem)
      return containerDiv
    } else {
      listItem.textContent = style
      return listItem
    }
  }

  function hightLightFontOnPage (e) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { styleId: `${e.target.value}` },
        function (response) {
          console.log(response)
        }
      )
    })
  }

  function rgbToHex (rbgStr) {
    const rgbArr = rbgStr.split('(')[1].split(')').join('').split(',')
    if (rgbArr.length === 4) rgbArr.pop()

    const hexConvert = rgbArr.map(value => {
      switch (true) {
        case +value < 0:
          return 0
        case +value > 255:
          return 255
        default:
          return +value
      }
    }).map(val => {
      const hexVal = parseInt(val).toString(16).toUpperCase().trim()
      return hexVal.length === 1 ? '0' + hexVal : hexVal
    }).join('')
    return `#${hexConvert}`
  }

  function createNotification (title, message) {
    const options = {
      type: 'basic',
      iconUrl: '../images/color_16px.png',
      title: title,
      message: message,
      requireInteraction: false
    }
    chrome.notifications.create(options)
  }

  async function copyToClipboard (e) {
    if (!navigator.clipboard) {
      console.error('Clipboard is unavailable')
      return
    }
    const text = e.target.innerText
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

  function getItem (item, func = (data) => console.log(data)) {
    chrome.storage.sync.get(item, func)
  }

  function inspectDomForChanges (domEl, domElRemove) {
    const config = { attributes: true, childList: true, subtree: true }
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback)
    // Callback function to execute when mutations are observed
    function callback (mutationsList, observer) {
      for (const mutation of mutationsList) {
        console.log('mutation', mutation)
        if (mutation.type === 'childList') {
          domElRemove.style.display = 'none'
          observer.disconnect()
        }
      }
    }
    // Start observing the target node for configured mutations
    observer.observe(domEl, config)
  }

  // function setItem (item, func = () => false) {
  //   chrome.storage.sync.set(item)
  // }
})()
