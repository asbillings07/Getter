/* global chrome */
export default (function () {
  function getItem(item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem(item, func = () => false) {
    chrome.storage.local.set(item, func)
  }
  function createNotification(title, message) {
    const options = {
      type: 'basic',
      iconUrl: '../images/CSS-Getter-Icon-16px.png',
      title: title,
      message: message,
      requireInteraction: false
    }
    chrome.notifications.create(options)
  }
  function rgbToHex(rbgStr) {
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

  async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

  return { getItem, setItem, createNotification, rgbToHex, getCurrentTab }
}())
