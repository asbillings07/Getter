import React, { Children, useEffect } from 'react'
import { useGetterContext } from '../Store';
import { hightLightFontOnPage } from '../utils';
import { ViewHeader, NotFound } from '../components';
import { Logos } from '../components/Logos';

export const FontView = () => {
    const FONTS = 'fonts'
    const { cssData, propName, loading, setLoading } = useGetterContext()

    useEffect(() => {
        console.log('FONT VIEW', { cssData })
        if (cssData !== null) {
            setLoading(false)
        }
    }, [cssData])

    const fontData = cssData?.fonts && Object.entries(cssData?.fonts)

    const shouldRender = FONTS === propName && fontData ? true : false;

    const renderFonts = () => {

        if (loading) {
            return <div id='spinner'></div>
        }

        if (fontData.length === 0) { 
            return <NotFound /> 
        }


          return Children.toArray(fontData.map(([element, fonts]) => {
                const fontHref = `https://fonts.google.com/?query=${fonts.fontFamily.split(',')[0]}`;
                const styles = Children.toArray(Object.entries(fonts).map(([key, value]) => {
                    if (key === 'id') return;
                    return (
                        <div id="font-element" >
                            {key}:&nbsp;{value}&nbsp;
                            {key === 'fontFamily' ? <Logos logo='link' href={fontHref} /> : null}
                        </div>
                    )
                }));

                return (
                    <div className={`${FONTS}-container`} id='font-card'>
                        <div id="liContainer" className='li-font'>
                            <div id="font-heading" value={fonts.id} onClick={hightLightFontOnPage}>{element}</div>
                            {styles}
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