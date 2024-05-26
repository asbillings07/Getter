import React, { Children } from 'react'
import { useGetterContext } from '../Store';
import { hightLightFontOnPage } from '../../utils';
import { Logos } from '../components/Logos';

export const FontView = () => {
    const FONTS = 'fonts'
    const { cssData, propName } = useGetterContext()
    const fontData = cssData?.fonts ? Object.entries(cssData?.fonts) : []

    const shouldRender = FONTS === propName && cssData?.fonts

    console.log('fontData', fontData)

    return shouldRender && (
        <>
            <div className='h1-container'>
                <h1>{FONTS.toUpperCase()}</h1>
            </div>
            <div className='divider'></div>
            <div id={`main-${FONTS}-container`}>
                {Children.toArray(fontData.map(([element, fonts]) => {
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
                )}))}
            </div>
        </>
    );
}