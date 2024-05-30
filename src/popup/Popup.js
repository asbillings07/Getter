import React, { Suspense, useState, useEffect } from 'react'
import { crawlPage } from '../scripts/crawlPage';
import { deepEqual, sortData, setItem } from '../utils';
import { useGetterContext } from '../Store';
import { ColorView, FontView, ImageView, SupportView, SettingsView } from '../views';

export const Popup = () => {
    const { error, setError } = useGetterContext();
    const [currentTab, setCurrentTab] = useState(null);
    const [cssData, setCssData] = useState(null);


    useEffect(() => {
        const getCurrentTab = async () => {
            let queryOptions = { active: true, currentWindow: true };
            let [tab] = await chrome.tabs.query(queryOptions);

            const isRestricted = tab.url.includes('chromewebstore');
            if (isRestricted) { 
                setError({
                    state: true,
                    message: 'This extension does not work on Chrome Webstore pages.'
                });
            } else {
                setCurrentTab(tab)
            }
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
            {error.state ? <div className='error-container'>{error.message}</div> : 
            (<>
                    <Suspense fallback={<div id='spinner'></div>}>
                        <FontView data={cssData} />
                    </Suspense>
                    <Suspense fallback={<div id='spinner'></div>}>
                        <ColorView data={cssData} />
                    </Suspense>
                    <ImageView data={cssData} />
                    <SupportView />
                    <SettingsView />
            </>)}
            
        </div>
    )
}
