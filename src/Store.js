import React, { createContext, useContext, useState, useEffect } from 'react'
import { getItem } from './utils'
import { crawlPage } from './scripts/crawlPage'

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
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState(null);
    const [cssData, setCssData] = useState(null);
    const [error, setError] = useState({
        state: false,
        message: ''
    });
    const [cssOptions, setCssOptions] = useState(null)

    useEffect(() => {
        getItem('cssGetterOptions', ({ cssGetterOptions }) => {
            if (cssGetterOptions) {
                setCssOptions(cssGetterOptions)
            }
        })
        setLoading(true)
    }, [])

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


    const value = {
        propName,
        setPropName,
        cssData,
        setCssData,
        error,
        setError,
        loading, 
        setLoading,
        cssOptions,
        setCssOptions
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
