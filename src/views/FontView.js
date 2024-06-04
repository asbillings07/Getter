import React, { Children, useEffect, useState } from 'react'
import { useGetterContext } from '../Store';
import { isObjEmpty } from '../utils';
import { ViewHeader, NotFound, Logos } from '../components';

export const FontView = () => {
    const FONTS = 'fonts'
    const { propName, loading, cssOptions, cssData } = useGetterContext()
    const [showAttributes, setShowAttributes] = useState({});

    const fontData = cssData?.fonts && Object.entries(cssData?.fonts)
    const fontOptions = cssOptions?.fonts

    const shouldRender = FONTS === propName;

    const toggleFontVisibility = (element) => {
        setShowAttributes((prevVisibleFonts) => ({
            ...prevVisibleFonts,
            [element]: !prevVisibleFonts[element]
        }));
    };

    const fontMap = (font) => {
        return {
            'fontFamily': 'font-family',
            'fontWeight': 'font-weight',
            'fontSize': 'font-size',
            'letterSpacing': 'letter-spacing',
            'lineHeight': 'line-height',
            'color': 'color',
            'backgroundColor': 'background-color'
        }[font]
    }

    const renderFonts = () => {

        if (loading) {
            return <div id='spinner'></div>
        }

        if (!fontData) {
            return <NotFound name='fonts' />
        }

        const FontAttributes = ({ font }) => {
            const fontHref = `https://fonts.google.com/?query=${font.fontFamily.split(',')[0]}`;
            return Children.toArray(Object.entries(font).map(([key, value]) => {
                if (key === 'id') return;

                if (fontOptions[key]) {
                    return (
                        <div id="font-element">
                            {`${fontMap(key)}: ${value} `}
                            {key === 'fontFamily' ? <Logos logo='link' href={fontHref} /> : null}
                        </div>
                    )
                }

                return null
            }))
        }

        return Children.toArray(fontData.map(([element, fonts]) => {
            const fontElements = Children.toArray(fonts.map((font, i) => {

                if (fontOptions.detailed) {
                    return (
                        <div className='font-element-container'>
                            <FontAttributes font={font} />
                        </div>
                    )
                }

                return i == 0 ? (
                    <div className='font-element-container'>
                        <FontAttributes font={font} />
                    </div>
                ) : null

            }))

            return (
                <div className={`${FONTS}-container`} id='font-card'>
                    <div id="liContainer" className='li-font'>
                        
                        <div id="font-heading" value={fonts.id}>
                            <Logos logo='downArrow' onclick={() => toggleFontVisibility(element)} />
                            <div>{element}</div>
                        </div>
                        {!showAttributes[element] && fontElements}
                    </div>
                </div>
            )
        }))
    }

    return shouldRender && (
        <>
            <ViewHeader title={FONTS.toUpperCase()} />
            <div id={`main-${FONTS}-container`}>
                {renderFonts()}
            </div>
        </>
    );
}