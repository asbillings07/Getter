import React, { createContext, useContext, useState } from 'react'

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
    const [cssData, setCssData] = useState(null);

    const value = {
        propName,
        setPropName,
        currentTab,
        setCurrentTab,
        cssData,
        setCssData
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
