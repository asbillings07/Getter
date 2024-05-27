import React, { Children, useState, useEffect } from 'react'
import { useGetterContext } from '../Store';
import { ViewHeader, NotFound } from '../components';
import { Tooltip } from 'react-tooltip';
import { copyToClipboard, rgbToHex, splitRgb } from '../utils';

export const ColorView = ({ data }) => {
    const { propName, loading } = useGetterContext()
    const [isOpen, setIsOpen ] = useState(false)
    const [color, setColor] = useState('')

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setIsOpen(false)
            }, 1000)
        }
    }, [color])


    const COLORS = 'colors'
    const colorData = data?.colors && Object.entries(data.colors);

    const shouldRender = COLORS === propName && colorData ? true : false;

    const setTextColor = (style) => {
        const rgbValue = splitRgb(style);
        var color = Math.round(((parseInt(rgbValue[0]) * 299) +
            (parseInt(rgbValue[1]) * 587) +
            (parseInt(rgbValue[2]) * 114)) / 1000);
        return (color > 125) ? 'black' : 'white';
    }

    const handleColorClick = (e) => {
        setColor(e.target.innerText)
        setIsOpen(true)
        copyToClipboard(e)
    }

    const renderColor = () => {

        if (loading) {
            return <div id='spinner'></div>
        }

        if (!colorData) {
            return <NotFound />
        }

          return Children.toArray(colorData.map(([style, data]) => (
                <div className={`${COLORS}-container`} style={{ background: `${style}` }}>
                    <div id="liContainer" className='li-color' style={{ color: setTextColor(style) }}>
                        <div id="hexDiv" data-tooltip-id="color-div-tooltip-click" data-tooltip-variant="success" className="mr pointer" onClick={handleColorClick}>{rgbToHex(style)}</div>
                        <div id="listItem" data-tooltip-id="color-div-tooltip-click" data-tooltip-variant="success" className="mr pointer" onClick={handleColorClick}>{style}</div>
                        <p id="listDesc">used {data.count} time(s)</p>
                    </div>
                    <Tooltip
                        id="color-div-tooltip-click"
                        content={`${color} copied to clipboard!`}
                        isOpen={isOpen}
                    />
                </div>
            )))
    }

    return shouldRender && (
       <>
            <ViewHeader title={COLORS.toUpperCase()} />
            <div id={`main-${COLORS}-container`}>
                {renderColor()}
            </div>
        </> 
    );
}
