import React, { createContext, useContext, useEffect, useState } from 'react'
import { crawlPage } from './crawlPage';

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

    const value = {
        propName,
        setPropName,
        currentTab
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
