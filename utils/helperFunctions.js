/* global chrome */

  const getItem = (item, func = (data) => false) => {
    chrome.storage.local.get(item, func)
  }
  const setItem = (item, func = () => false) => {
    chrome.storage.local.set(item, func)
  }

const createNotification = (title, message, buttons = false, interaction = false) => {
  const options = {
    type: 'basic',
    iconUrl: '../images/CSS-Getter-Icon-16px.png',
    title: title,
    message: message,
    requireInteraction: interaction
  };
  if (buttons) {
    options.buttons = buttons;
  }

  chrome.notifications.getPermissionLevel((level) => {
    if (level === 'granted') {
      chrome.notifications.create(options);
    }
  })
}

export const sortData = (cssObj) => {
  const viewElements = {};
  const sortFnCount = (a, b) => {
    return a[1].count === b[1].count
      ? 0
      : a[1].count > b[1].count
        ? -1
        : 1
  }
  const sortFn = (a, b) => {
    return a[0] === b[0]
      ? 0
      : a[0] < b[0]
        ? -1
        : 1
  }

  for (const type in cssObj) {
    let sortedObjArr;
    if (type === 'colors') {
      sortedObjArr = Object.entries(cssObj[type]).sort(sortFnCount);
    } else {
      sortedObjArr = Object.entries(cssObj[type]).sort(sortFn);
    }
  }

  return cssObj
}

const splitRgb = (rgbStr) => { 
  return rgbStr.split('(')[1].split(')').join('').split(',') ?? [];
}

function rgbToHex(rbgStr) {
  const rgbArr = splitRgb(rbgStr);
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

const copyToClipboard = async (e) => {
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
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}

function deepEqual(obj1, obj2) {
  // Base case: If both objects are identical, return true.
  return Object.is(obj1, obj2) && JSON.stringify(obj1) === JSON.stringify(obj2)
}

const downloadImage = async (image, callback) => {
  return chrome.downloads.download({ url: image, saveAs: false, conflictAction: 'uniquify' }, callback);
}

const downloadAllImages = (images) => {
  images.forEach((image) => {
    downloadImage(image.src);
  });
}

const hightLightFontOnPage = (e) => {
  chrome.tabs.sendMessage(
    currentTab.id,
    { styleId: `${e.target.value}` },
    (response) => {
      console.log('****Message Response****', response);
    }
  );

}

  export {
    getItem,
    setItem,
    rgbToHex,
    copyToClipboard,
    downloadAllImages,
    hightLightFontOnPage,
    downloadImage,
    splitRgb,
    deepEqual,
    createNotification
  }