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
  chrome.notifications.create(options);
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
    createNotification(
      'Copied to Clipboard!',
      `${text} has been copied to the clipboard.`
    );
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}

const downloadImage = (_e, image) => {
  setItem({ currentImage: image });

  const buttons = [{
    title: 'View image'
  }, {
    title: 'Download image'
  }];

  createNotification('Image Notification', 'What would you like to do?', buttons, true);
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
    hightLightFontOnPage,
    downloadImage,
    splitRgb,
    createNotification
  }