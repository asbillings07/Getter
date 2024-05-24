/* global chrome MutationObserver */
import {
    ColorElement,
    ImageElement,
    FontElement,
    createNotification,
    NoItemsElement,
    downloadAllImages
} from '../../utils';
import React, { useState, Children, Suspense } from 'react'
import { useGetterContext } from '../Store';
import { Logos } from './Logos';

export const Popup = () => {
    const { propName, currentTab } = useGetterContext();
    const [cssData, setCssData] = useState(null);

    chrome.runtime.onMessage.addListener(onMessage);

    const createView = (cssObj) => {
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

            viewElements[type] = createViewElements(type, sortedObjArr)
        }

        return (
            <>
                {
                    viewElements[propName] ?
                        Children.toArray(viewElements[propName]) : NoItemsElement()
                }
            </>
        )
    }

    const createViewElements = (name, arr) => {
        return (
            <>
                <div className='h1-container'>
                    <h1>{name.toUpperCase()}</h1>
                    {name === 'images' ? <Logos logo='download' onclick={() => downloadAllImages(cssData['images'])} /> : null}
                </div>
                <div className='divider'></div>
                <div id={`main-${name}-container`}>
                    {Children.toArray(arr.map((prop) => createElementsByProp(name, prop)))}
                </div>
            </>
        );
    }

    const createElementsByProp = (name, prop) => {
        switch (name) {
            case 'colors':
                return ColorElement(name, prop);
            case 'fonts':
                return FontElement(name, prop);
            case 'images':
                return ImageElement(name, prop);
            default:
                return null;
        }
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
        <Suspense fallback={<div id='spinner'></div>}>
            <div className='css-content'>{createView(cssData)}</div>
        </Suspense>
    )
}
