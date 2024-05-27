import React, { Suspense } from 'react'
import { ColorView, FontView, ImageView, InfoView, SettingsView } from '../views';

export const Popup = () => {

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
