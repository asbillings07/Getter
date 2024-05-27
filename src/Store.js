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
    const [loading, setLoading] = useState(true);
    const [cssOptions, setCssOptions] = useState(initialOptionState)


    const value = {
        propName,
        setPropName,
        loading, 
        setLoading,
        cssOptions,
        setCssOptions
    }

    return <GetterContext.Provider value={value}>{children}</GetterContext.Provider>
}
