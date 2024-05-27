import React, { createContext, useContext, useEffect, useState } from 'react'
import { crawlPage } from './crawlPage';
import { deepEqual, sortData, setItem } from './utils';

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
    const initialOptionState = {
        fonts: {
            fontFamily: true,
            fontWeight: true,
            fontSize: true,
            letterSpacing: true,
            lineHeight: true,
        },
        colors: {
            rgb: true,
            hex: true,
            buttonColor: true
          },
        images: {
            fileSize: true,
            imageDimensions: true
          }
    }

    const [propName, setPropName] = useState('fonts')
    const [currentTab, setCurrentTab] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cssData, setCssData] = useState(null);
    const [hasScriptRun, setHasScriptRun] = useState(false);
    const [cssOptions, setCssOptions] = useState(initialOptionState)

    useEffect(() => {
        const getCurrentTab = async () => {
            let queryOptions = { active: true, currentWindow: true };
            let [tab] = await chrome.tabs.query(queryOptions);
            setCurrentTab(tab)
        }

        if (currentTab && !hasScriptRun) {
            onTabQuery(currentTab);
            setHasScriptRun(true);
        } else {
            getCurrentTab();
        }
    }, [currentTab])

    useEffect(() => {
        if (cssData === null) {
            setLoading(true);
        }
    }, [cssData])

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
            case 'getOptions':
                setCssOptions({ ...initialOptionState, ...request.payload })
                break
            case 'getNotif':
                createNotification(request.payload.title, request.payload.message);
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

    const value = {
        propName,
        setPropName,
        currentTab,
        loading, 
        setLoading,
        cssData,
        cssOptions,
        setCssOptions
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
