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
    const [propName, setPropName] = useState('backgroundColor')

    const value = {
        propName,
        setPropName
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
