/* global chrome */

function getItem(key, func = (data) => false) {
  chrome.storage.sync.get(key, func);
}
function setItem(item, func = () => false) {
  chrome.storage.sync.set(item, func);
}

function sendMessage(message) {
  return chrome.runtime.sendMessage({ action: 'getCSSValues', payload: null });
}
function createNotification({ title, message, buttons, interaction }) {
  const options = {
    type: 'basic',
    iconUrl: 'CSS-Getter-Icon-16px.png',
    title: title,
    message: message,
    requireInteraction: interaction || false
  };
  if (buttons) {
    options.buttons = buttons;
  }
  chrome.notifications.create(options);
}

const hasNodeRenderedBefore = (id) => {
  const node = document.getElementById(id);
  return node !== null ? true : false;
};

function rgbToHex(rbgStr) {
  const rgbArr = rbgStr.split('(')[1].split(')').join('').split(',');
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

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function isObjEmpty(obj) {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

async function copyToClipboard(e) {
  if (!navigator.clipboard) {
    console.error('Clipboard is unavailable');
    return;
  }

  let text;

  if (e.target.innerText) {

    text = e.target.innerText;
  } else {
    text = rgbToHex(e.target.style.backgroundColor);
  }

  try {
    await navigator.clipboard.writeText(text);
    createNotification({
      title: 'Copied to Clipboard!',
      message: `${text} has been copied to the clipboard.`
    });
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}

function downloadImage(_e, image) {
  setItem({ currentImage: image });

  const buttons = [{
    title: 'View image'
  }, {
    title: 'Download image'
  }];

  createNotification({ title: 'Image Notification', message: 'What would you like to do?', buttons, interaction: true });
}

const grabItem = (item = null) => {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(item, (data) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      if (data[item]) {
        resolve(data[item]);
      }
      resolve(data);
    });
  });
};

async function isCacheEmpty(cache, key) {

  if (isObjEmpty(cache)) {
    return true;
  }
  return false;

};
function inspectDomForChanges(domEl, domElRemove) {
  const config = { attributes: true, childList: true, subtree: true };
  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);
  // Callback function to execute when mutations are observed
  function callback(mutationsList, obs) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        domElRemove.style.display = 'none';
        obs.disconnect();
      }
    }
  }
  // Start observing the target node for configured mutations
  if (domEl) {
    observer.observe(domEl, config);
  }
}

export {
  getItem,
  isCacheEmpty,
  grabItem,
  sendMessage,
  setItem,
  createNotification,
  rgbToHex,
  getCurrentTab,
  isObjEmpty,
  copyToClipboard,
  inspectDomForChanges,
  hasNodeRenderedBefore,
  downloadImage
}

