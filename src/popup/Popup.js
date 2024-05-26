import React, { Suspense } from 'react'
import { ColorView, FontView, ImageView } from '../views';

const isObjEmpty = (obj) => {
    return obj === null || Object.entries(obj).length === 0;
}

export const Popup = () => {
    // {
    //     isObjEmpty(cssData) ? <div id='spinner'></div> : createView(cssData)
    // }
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
        </div>
    )
}
