/* global chrome MutationObserver */
import { setItem, createNotification } from '../../utils/helperFunctions';
import { createColorElement, createImgSrcElement, createBgImageElement, createFontElement, createDefaultElement } from '../components/helpers';
import { crawlPage } from '../crawlPage';
import React, { useEffect, useState, Children } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export const Popup = () => {
    const [currentTab, setCurrentTab] = useState(null);
    const [cssData, setCssData] = useState(null);

    chrome.runtime.onMessage.addListener(onMessage);

    const getProperName = (cssName) =>
    ({
        backgroundColor: 'Background Color',
        color: 'Color',
        fontFamily: 'Font Family',
        fontWeight: 'Font Weight',
        fontSize: 'Font Size',
        imageSource: 'Image Source',
        backgroundImage: 'Background Image'
    }[cssName]);


    useEffect(() => {
        const getCurrentTab = async () => {
            let queryOptions = { active: true, currentWindow: true };
            let [tab] = await chrome.tabs.query(queryOptions);
            setCurrentTab(tab)
        }
        if (currentTab) {
            onTabQuery(currentTab);
        } else {
            getCurrentTab();
        }
    }, [currentTab])


    function createView(cssObj) {
        const viewElements = [];
        const sortImgs = (a, b) => {
            return a[1].style.length === b[1].style.length
                ? 0
                : a[1].style.length > b[1].style.length
                    ? -1
                    : 1
        }

        for (const type in cssObj) {
            let sortedObjArr;
            if (type === 'imageSource') {
                sortedObjArr = Object.entries(cssObj[type]).filter(([key, value]) => key === 'images');
            } else {
                sortedObjArr = Object.entries(cssObj[type]).sort(sortImgs);
            }

           viewElements.push(createViewElements(type, sortedObjArr))
        }

        return (
            <>
                {viewElements}
            </>
        )
    }

    function createViewElements(name, arr) {
            return (
                <ul>
                    <h3>{`${getProperName(name)}(s) used on page`}</h3>
                    {Children.toArray(arr.map((prop) => <li>{createElementsByProp(name, prop)}</li>))}
                </ul>
            );
    }

    function createElementsByProp(name, prop) {
        const [style, freq] = prop;

        switch (name) {
            case 'backgroundColor':
                return createColorElement({ freq, style, rgbToHex, copyToClipboard });
            case 'color':
                return createColorElement({ freq, style, rgbToHex, copyToClipboard });
            case 'fontFamily':
                return createFontElement({ freq, style, hightLightFontOnPage });
            case 'imageSource':
                return createImgSrcElement({ freq, style, downloadImage });
            case 'backgroundImage':
                return createBgImageElement({ freq, style, downloadImage });
            default:
                return createDefaultElement({ style });
        }
    }

    function hightLightFontOnPage(e) {
        chrome.tabs.sendMessage(
            currentTab.id,
            { styleId: `${e.target.value}` },
            function (response) {
                console.log('****Message Response****', response);
            }
        );

    }

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
            createNotification(
                'Copied to Clipboard!',
                `${text} has been copied to the clipboard.`
            );
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

        createNotification('Image Notification', 'What would you like to do?', buttons, true);
    }

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getState':
                setCssData(request.payload);    
                break;
            case 'getNotif':
                createNotification(request.payload.title, request.payload.message);
                break;
            case 'getCurrentResults':
                setCssData(request.payload);
                break;
            default:
                break;
        }
    }



    function onTabQuery(tab) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, },
            func: crawlPage
        });
    }

  return (
    <div id='main'>
        {
              cssData ? createView(cssData) : <div id='spinner'><FontAwesomeIcon icon={faSpinner} spin /></div>
        }
    </div>
  )
}
