import React, { Children, useEffect} from 'react'
import { useGetterContext } from '../Store';
import { Tooltip } from 'react-tooltip';
import { copyToClipboard, splitRgb } from '../../utils';

export const ColorView = () => {
    const { cssData, propName } = useGetterContext()
    const COLORS = 'colors'
    const colorData = cssData?.colors ? Object.entries(cssData.colors) : null;

    const shouldRender = COLORS === propName && colorData ? true : false;

    console.log('ColorData', shouldRender)

    const setTextColor = (style) => {
        const rgbValue = splitRgb(style);
        var color = Math.round(((parseInt(rgbValue[0]) * 299) +
            (parseInt(rgbValue[1]) * 587) +
            (parseInt(rgbValue[2]) * 114)) / 1000);
        return (color > 125) ? 'black' : 'white';
    }

    return shouldRender && (
        <>
            <div className='h1-container'>
                <h1>{COLORS.toUpperCase()}</h1>
            </div>
            <div className='divider'></div>
            <div id={`main-${COLORS}-container`}>
                {Children.toArray(colorData.map(([style, data]) => (
                    <div className={`${COLORS}-container`} style={{ background: `${style}` }}>
                        <div id="liContainer" className='li-color' style={{ color: setTextColor(style) }}>
                            <div id="hexDiv" data-tooltip-id="color-div-tooltip-click" data-tooltip-delay-hide={1000} data-tooltip-variant="success" className="mr pointer" onClick={copyToClipboard}>{data.colorOption}</div>
                            <div id="listItem" data-tooltip-id="color-div-tooltip-click" data-tooltip-delay-hide={1000} data-tooltip-variant="success" className="mr pointer" onClick={copyToClipboard}>{style}</div>
                            <p id="listDesc">used {data.count} time(s)</p>
                        </div>
                        <Tooltip
                            id="color-div-tooltip-click"
                            content="Color copied to clipboard!"
                            openOnClick={true}
                        />
                    </div>
                )))}
            </div>
        </>
    );
}
