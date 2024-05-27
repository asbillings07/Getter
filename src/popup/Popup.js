import React, { Suspense, useState, useEffect } from 'react'
import { crawlPage } from '../crawlPage';
import { ColorView, FontView, ImageView, InfoView, SettingsView } from '../views';

export const Popup = () => {
    const [currentTab, setCurrentTab] = useState(null);


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


    return (
        <div className='css-content'>
            <Suspense fallback={<div id='spinner'></div>}>
                <FontView />
            </Suspense>
            <Suspense fallback={<div id='spinner'></div>}>
                <ColorView />
            </Suspense>
            <Suspense fallback={<div id='spinner'></div>}>
                <ImageView />
            </Suspense>
            <InfoView />
            <SettingsView />
        </div>
    )
}
