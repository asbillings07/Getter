import { setItem, getItem, grabItem, isCacheEmpty, getCurrentTab, createNotification } from './utils/helperFunctions.js';
import { CacheManager } from './utils/cacheManager'
import "regenerator-runtime/runtime.js";

/* global chrome  */
const initialState = {
  currentImage: null,
  pageRefreshed: false,
  cssGetters: {
    css: [
      'fontFamily',
      'backgroundColor',
      'color'
    ],
    color: 'yellow'
  },
  filteredElements: ['time', 'iframe', 'input', 'br', 'form'],
  fontDict: {}
}
const storageCache = new CacheManager(initialState)
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

async function setCurrentTab () {
  let tab = await getCurrentTab();
  setItem({ currentTab: tab });
}




// chrome.storage.onChanged.addListener((changes) => {
//   if ('cssGetters' in changes && (changes.cssGetters.oldValue !== changes.cssGetters.newValue)) {
//     Object.assign(storageCache, { ...storageCache, cssGetters: changes.cssGetters.newValue })
//     console.log('storageCache - cssGetters', storageCache);
//     console.log('cssGetters New Value', changes.cssGetters.newValue);
//   }
//   if ('filteredElements' in changes && changes.filteredElements.newValue) {
//     storageCache.filteredElements = changes.filteredElements.newValue;
//     console.log('storageCache - filteredElements', storageCache);
//   }
//   if ('fontDict' in changes && changes.fontDict.newValue) {
//     storageCache.fontDict = changes.fontDict.newValue;
//     console.log('storageCache - fontDict', storageCache);
//   }
// });

// chrome.webNavigation.onDOMContentLoaded.addListener((_object) => {
//   setItem({
//     currentImage: null,
//     pageRefreshed: true,
//     cssGetters: storageCache?.cssGetters ?? [
//       'fontFamily',
//       'backgroundColor',
//       'color'
//     ],
//     filteredElements: ['time', 'iframe', 'input', 'br', 'form'],
//     fontDict: {}
//   });
// });

chrome.tabs.onActivated.addListener(function () {
  // todo need to check if tab or url in current tab changes
});

chrome.runtime.onMessage.addListener(async (
  request,
  sender,
  sendResponse
) => {
  // create storageCache class with getters and setters
  return {
    'getInitialState': (storageCache) => sendResponse(storageCache.getAllState()),
    'getCSSValues': (storageCache) => sendResponse({ cssValues: storageCache.getState('cssGetters') }),
    'setCSSValues': (storageCache, request) => sendResponse(storageCache.setState('cssGetters', request.payload)),
    'getElementValues': (storageCache) => sendResponse({ filteredElementValues: storageCache.getState('filteredElements') }),
    'getFontDict': (storageCache) => sendResponse({ fontDict: storageCache.getState('fontDict') })
  }[request.action]?.(storageCache, request);
});


chrome.runtime.onInstalled.addListener(function () {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([rule1]);
    console.log('Is this running????');
    setItem(initialState);
  });
});

async function onNotifButtonPress (_id, buttonIdx) {
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

function createLink (image, download, view) {
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

