/* global chrome MutationObserver */
import { createColorElement, createImgSrcElement, createBgImageElement, createFontElement, createDefaultElement, createNotification } from '../../utils';
import { crawlPage } from '../crawlPage';
import React, { useEffect, useState, Children } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export const Popup = ({ propName }) => {
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


    const onTabQuery = (tab) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, },
            func: crawlPage
        });
    }

    const createView = (cssObj) => {
        const viewElements = {};
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

            viewElements[type] = createViewElements(type, sortedObjArr)
        }

        return (
            <>
                {Children.toArray(viewElements[propName])}
            </>
        )
    }

    const createViewElements = (name, arr) => {
            return (
                <ul>
                    <h3>{`${getProperName(name)}(s) used on page`}</h3>
                    {Children.toArray(arr.map((prop) => <li>{createElementsByProp(name, prop)}</li>))}
                </ul>
            );
    }

    const createElementsByProp = (name, prop) => {
        return {
            'backgroundColor': (prop) => createColorElement(prop),
            'color': (prop) => createColorElement(prop),
            'fontFamily': (prop) => createFontElement(prop),
            'imageSource': (prop) => createImgSrcElement(prop),
            'backgroundImage': (prop) => createBgImageElement(prop),
        }[name](prop) ?? createDefaultElement(prop);
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

  return (
    <>
        {
              cssData ? <div className='css-content'>{createView(cssData)}</div> : <div id='spinner'><FontAwesomeIcon icon={faSpinner} spin /></div>
        }
    </>
  )
}
