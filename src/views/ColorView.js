import React, { Children, useState, useEffect } from 'react'
import { useGetterContext } from '../Store';
import { ViewHeader, NotFound } from '../components';
import { Tooltip } from 'react-tooltip';
import { copyToClipboard, rgbToHex, splitRgb } from '../utils';

export const ColorView = () => {
    const { propName, loading, cssData, cssOptions } = useGetterContext()
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
    const colorOptions = cssOptions?.colors
    const colorData = cssData?.colors && Object.entries(cssData.colors);

    const shouldRender = COLORS === propName

    const setTextColor = (style) => {
        if (!colorOptions.buttonColor) return 'var(--black)';

        const rgbValue = splitRgb(style);
        const color = Math.round(((parseInt(rgbValue[0]) * 299) +
            (parseInt(rgbValue[1]) * 587) +
            (parseInt(rgbValue[2]) * 114)) / 1000);

        if (rgbValue[3] && parseFloat(rgbValue[3]) < 0.5) {
            return 'var(--black)';
        }

        return (color > 125) ? 'var(--black)' : 'var(--white)';
    }

    const getColors = (style) => {
        return {
            'hex': colorOptions.hex && rgbToHex(style),
            'buttonColor': colorOptions.buttonColor && style
        }
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
            return <NotFound name='colors' />
        }

          return Children.toArray(colorData.map(([style, data]) => (
                <div className={`${COLORS}-container`} style={{ background: `${getColors(style).buttonColor}` }}>
                    <div id="liContainer" className='li-color' style={{ color: setTextColor(style) }}>
                        <div id="hexDiv" data-tooltip-id="color-div-tooltip-click" data-tooltip-variant="success" className="mr pointer" onClick={handleColorClick}>{getColors(style).hex}</div>
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
