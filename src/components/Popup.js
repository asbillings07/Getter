/* global chrome MutationObserver */
import {
    createColorElement,
    createImgSrcElement,
    createBgImageElement,
    createFontElement,
    createNotification,
    noItemsElement
} from '../../utils';
import { crawlPage } from '../crawlPage';
import React, { useEffect, useState, Children } from 'react'
import { useGetterContext } from '../Store';

export const Popup = () => {
    const { propName, cssData, setCssData, currentTab, setCurrentTab } = useGetterContext();

    chrome.runtime.onMessage.addListener(onMessage);

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
        console.log('CSS OBJ', cssObj)
        const viewElements = {};
        const sortFn = (a, b) => {
            return a[1].count === b[1].count
                ? 0
                : a[1].count > b[1].count
                    ? -1
                    : 1
        }

        for (const type in cssObj) {
            let sortedObjArr;
            if (type === 'colors') {
                sortedObjArr = Object.entries(cssObj[type]).sort(sortFn);
            } else {
                sortedObjArr = Object.entries(cssObj[type]);
            }

            viewElements[type] = createViewElements(type, sortedObjArr)
        }

        return (
            <>
                {
                    viewElements[propName] ?
                        Children.toArray(viewElements[propName]) : noItemsElement()
                }
            </>
        )
    }

    const createViewElements = (name, arr) => {
        return (
            <div>
                <h1>{name.toUpperCase()}</h1>
                <div className='divider'></div>
                {Children.toArray(arr.map((prop) => createElementsByProp(name, prop)))}
            </div>
        );
    }

    const createElementsByProp = (name, prop) => {
        console.log('NAME', name)
        return {
            'colors': (name, prop) => createColorElement(name, prop),
            'fonts': (name, prop) => createFontElement(name, prop),
            'images': (name, prop) => createImgSrcElement(name, prop)
        }[name](name, prop)
    }

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getState':
                console.log('GET STATE', request.payload)
                setCssData(request.payload);
                break;
            case 'getNotif':
                createNotification(request.payload.title, request.payload.message);
                break;
            case 'getCurrentResults':
                console.log('GET CURRENT RESULTS', request.payload)
                setCssData(request.payload);
                break;
            default:
                break;
        }
    }

    return (
        <>
            {
                cssData ? <div className='css-content'>{createView(cssData)}</div> : <div id='spinner'></div>
            }
        </>
    )
}
