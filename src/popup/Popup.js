import React, { Suspense, useState, useEffect } from 'react'
import { crawlPage } from '../crawlPage';
import { deepEqual, sortData, setItem } from '../utils';
import { ColorView, FontView, ImageView, InfoView, SettingsView } from '../views';

export const Popup = () => {
    const [currentTab, setCurrentTab] = useState(null);
    const [cssData, setCssData] = useState(null);


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
            target: { tabId: tab.id, allFrames: true },
            func: crawlPage
        })
    }

    chrome.runtime.onMessage.addListener(onMessage);

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getState':
                console.log('GET STATE', request.payload)
                if (!deepEqual(sortData(request.payload), cssData)) {
                    setCssData(sortData(prevState => {
                        if (prevState !== null) {
                            setItem({
                                [sender.tab.url]: request.payload,
                                currentResults: { ...request.payload, ...prevState }
                            })
                            return { ...request.payload, ...prevState }
                        }
                    }));
                }
                break;
            case 'getCurrentResults':
                console.log('GET CURRENT RESULTS', request.payload)
                if (!deepEqual(sortData(request.payload), cssData)) {
                    setCssData(sortData(prevState => ({ ...prevState, ...request.payload })));
                }
                break;
            default:
                break;
        }
    }


    return (
        <div className='css-content'>
            <Suspense fallback={<div id='spinner'></div>}>
                <FontView data={cssData} />
            </Suspense>
            <Suspense fallback={<div id='spinner'></div>}>
                <ColorView data={cssData} />
            </Suspense>
            <Suspense fallback={<div id='spinner'></div>}>
                <ImageView data={cssData} />
            </Suspense>
            <InfoView />
            <SettingsView />
        </div>
    )
}
