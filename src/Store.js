import React, { createContext, useContext, useEffect, useState } from 'react'
import { crawlPage } from './crawlPage';
import { deepEqual, sortData } from '../utils';

const GetterContext = createContext()

export function useGetterContext() {
    const context = useContext(GetterContext)
    if (!context) {
        throw new Error(
            `You can't use context state outside of a provider, check where you are using this hook.`
        )
    }

    return context
}

export function Provider({ children }) {
    const [propName, setPropName] = useState('fonts')
    const [currentTab, setCurrentTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cssData, setCssData] = useState(null);
    const [cssOptions, setCssOptions] = useState(null)

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

    chrome.runtime.onMessage.addListener(onMessage);

    const onTabQuery = (tab) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true},
            func: crawlPage
        })
    }

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getState':
                if (!deepEqual(sortData(request.payload), cssData)) {
                    setCssData(sortData(request.payload));
                }
                break;
            case 'getOptions':
                setCssOptions(request.payload)
                break
            case 'getNotif':
                createNotification(request.payload.title, request.payload.message);
                break;
            case 'getCurrentResults':
                if (!deepEqual(sortData(request.payload), cssData)) {
                    setCssData(sortData(request.payload));
                }
                break;
            default:
                break;
        }
    }

    const value = {
        propName,
        setPropName,
        currentTab,
        loading, 
        setLoading,
        cssData,
        cssOptions
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
