import React, { Suspense } from 'react'
import { sortData } from '../utils';
import { useGetterContext } from '../Store';
import { ColorView, FontView, ImageView, SupportView, SettingsView } from '../views';

export const Popup = () => {
    const { error, setLoading, setCssData, cssData } = useGetterContext();

    chrome.runtime.onMessage.addListener(onMessage);

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
            // case 'getState':
            //         if (cssData !== null) {
            //             console.log('request.payload', request.payload)
            //             console.log('cssData', cssData)
            //             const updatedData = sortData({ ...request.payload, ...cssData });
            //             console.log('updatedData', updatedData)
            //             setCssData(updatedData);
            //             setLoading(false);
            //             setItem({
            //                 [sender.tab.url]: updatedData,
            //                 currentResults: updatedData
            //             })
            //         }
                
            //     break;
            case 'getCurrentResults':
                    const updatedData = sortData({ ...cssData, ...request.payload });
                    setCssData(updatedData);
                    setLoading(false)
                break;
            default:
                break;
        }
    }


    return (
        <div className='css-content'>
            {error.state ? <div className='error-container'>{error.message}</div> : 
            (<>
                    <Suspense fallback={<div id='spinner'></div>}>
                        <FontView />
                    </Suspense>
                    <Suspense fallback={<div id='spinner'></div>}>
                        <ColorView />
                    </Suspense>
                    <ImageView />
                    <SupportView />
                    <SettingsView />
            </>)}
            
        </div>
    )
}
