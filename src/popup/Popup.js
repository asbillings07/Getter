import React from 'react'
import { sortData } from '../utils';
import { Tooltip } from 'react-tooltip'
import { useGetterContext } from '../Store';
import { ColorView, FontView, ImageView, SupportView, SettingsView } from '../views';

export const Popup = () => {
    const { error, setLoading, setCssData, cssData } = useGetterContext();

    chrome.runtime.onMessage.addListener(onMessage);

    function onMessage(request, sender, sendResponse) {
        switch (request.action) {
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
                    <FontView />
                    <ColorView />
                    <ImageView />
                    <SupportView />
                    <SettingsView />
                    <Tooltip
                        id="logo-tooltip"
                        positionStrategy="fixed"
                        style={{ zIndex: 1000 }} 
                        place='top'
                    />
                </>)}

        </div>
    )
}
