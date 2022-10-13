import { setItem, getItem, grabItem, isCacheEmpty, getCurrentTab, createNotification } from './utils/helperFunctions.js';
import "regenerator-runtime/runtime.js";

/* global chrome  */
const storageCache = {};
await getCurrentTab();
const rule1 = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ['https', 'http'] }
    })
  ],
  actions: [new chrome.declarativeContent.ShowPageAction()]
};
let cssValues;
let filteredElementValues;

await initialStateCache(storageCache);

async function setCurrentTab() {
  let tab = await getCurrentTab();
  setItem({ currentTab: tab });
}




chrome.storage.onChanged.addListener((changes) => {
  if ('cssGetters' in changes && (changes.cssGetters.oldValue !== changes.cssGetters.newValue)) {
    storageCache.cssGetters = changes.cssGetters.newValue;
    console.log('cssGetters New Value', changes.cssGetters.newValue);
    console.log('storageCache - cssGetters', storageCache);
  }
  if ('filteredElements' in changes && changes.filteredElements.newValue) {
    storageCache.filteredElements = changes.filteredElements.newValue;
    console.log('storageCache - filteredElements', storageCache);
  }
  if ('fontDict' in changes && changes.fontDict.newValue) {
    storageCache.fontDict = changes.fontDict.newValue;
    console.log('storageCache - fontDict', storageCache);
  }
});

chrome.webNavigation.onDOMContentLoaded.addListener((_object) => {
  // setItem({
  //   currentImage: null,
  //   pageRefreshed: true,
  //   cssGetters: cssValues || [
  //     'fontFamily',
  //     'backgroundColor',
  //     'color'
  //   ],
  //   filteredElements: ['time', 'iframe', 'input', 'br', 'form'],
  //   fontDict: {}
  // });
});

chrome.tabs.onActivated.addListener(function () {
  // todo need to check if tab or url in current tab changes
});

chrome.runtime.onMessage.addListener(async (
  request,
  sender,
  sendResponse
) => {

  return {
    'getInitialState': (storageCache) => sendResponse(storageCache),
    'getCSSValues': (storageCache) => sendResponse({ cssValues: storageCache['cssGetters'] }),
    'getElementValues': (storageCache) => sendResponse({ filteredElementValues: storageCache['filteredElements'] }),
    'getFontDict': (storageCache) => sendResponse({ fontDict: storageCache['fontDict'] })
  }[request.action]?.(storageCache);
});


chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([rule1]);
    console.log('Is this running????');
    setItem({
      currentImage: null,
      pageRefreshed: false,
      cssGetters: [
        'fontFamily',
        'backgroundColor',
        'color'
      ],
      filteredElements: ['time', 'iframe', 'input', 'br', 'form'],
      fontDict: {}
    });
  });
});

async function initialStateCache(cache) {
  if (isCacheEmpty(cache)) {
    const initialState = await grabItem();
    Object.assign(cache, initialState);
  }
}

async function onNotifButtonPress(_id, buttonIdx) {
  const currentImage = await grabItem('currentImage');
  if (buttonIdx === 0) { // view image
    createLink(currentImage, false, true);
  }

  if (buttonIdx === 1) { // download image
    createLink(currentImage, true, false);
  }
  // getItem('currentImage', ({ currentImage }) => {
  //   if (buttonIdx === 0) { // view image
  //     createLink(currentImage, false, true)
  //   }

  //   if (buttonIdx === 1) { // download image
  //     createLink(currentImage, true, false)
  //   }
  // })
}

function createLink(image, download, view) {
  const a = document.createElement('a');
  if (image.includes('url')) {
    image = image.split('"')[1];
  }

  if (download) {
    chrome.downloads.download({ url: image });
  }

  if (view) {
    a.href = image;
    a.target = '_blank';
  }

  const clickHandler = () => null;

  a.addEventListener('click', clickHandler, false);
  a.click();
  a.removeEventListener('click', clickHandler);
}

chrome.notifications.onButtonClicked.addListener(onNotifButtonPress)

