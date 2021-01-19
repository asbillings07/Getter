/* global chrome */
export default (function () {
  function getItem (item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem (item, func = () => false) {
    chrome.storage.local.set(item, func)
  }
  function createNotification (title, message) {
    const options = {
      type: 'basic',
      iconUrl: '../images/CSS-Getter-Icon-16px.png',
      title: title,
      message: message,
      requireInteraction: false
    }
    chrome.notifications.create(options)
  }

  return { getItem, setItem, createNotification }
}())
