import React, { Children, useEffect } from 'react'
import { useGetterContext } from '../Store';
import { hightLightFontOnPage } from '../utils';
import { ViewHeader, NotFound, Logos } from '../components';

export const FontView = ({ data }) => {
    const FONTS = 'fonts'
    const { propName, loading, setLoading, cssOptions } = useGetterContext()

    useEffect(() => {
        if (data !== null || data !== undefined) {
            setLoading(false)
        }
    }, [data])

    const fontData = data?.fonts && Object.entries(data?.fonts)
    const fontOptions = cssOptions?.fonts

    const shouldRender = FONTS === propName;

    const renderFonts = () => {
        console.log('fontData', fontData)
        console.log('loading', loading)
        
        if (loading) {
            return <div id='spinner'></div>
        }

        if (!fontData) { 
            return <NotFound name='fonts' /> 
        }


          return Children.toArray(fontData.map(([element, fonts]) => {
                const fontHref = `https://fonts.google.com/?query=${fonts.fontFamily.split(',')[0]}`;
                const styles = Children.toArray(Object.entries(fonts).map(([key, value]) => {
                    if (!fontOptions[key] || key === 'id') return;
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