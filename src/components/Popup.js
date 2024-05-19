/* global chrome MutationObserver */
import {
    createColorElement,
    createImgSrcElement,
    createFontElement,
    createNotification,
    noItemsElement
} from '../../utils';
import React, { useEffect, useState, Children } from 'react'
import { useGetterContext } from '../Store';

export const Popup = () => {
    const { propName } = useGetterContext();
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
        return {
            'colors': (name, prop) => createColorElement(name, prop),
            'fonts': (name, prop) => createFontElement(name, prop),
            'images': (name, prop) => createImgSrcElement(name, prop)
        }[name](name, prop)
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
                cssData ? <div className='css-content'>{createView(cssData)}</div> : <div id='spinner'></div>
            }
        </>
    )
}
