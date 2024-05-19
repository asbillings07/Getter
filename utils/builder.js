import React, { Children } from 'react';
import { copyToClipboard, rgbToHex, hightLightFontOnPage, downloadImage, splitRgb } from './helperFunctions';
import { useGetterContext } from '../src/Store';
import { Logos } from '../src/components/Logos';

export const createFontElement = (name, prop) => {
    const [element, data] = prop;
    const fontHref = `https://fonts.google.com/specimen/${data.fontFamily.split(',')[0]}`;
    const styles = Children.toArray(Object.entries(data).map(([key, value]) => {
        if (key === 'id') return;
        return (
            <div id="font-element" >
                {key}:&nbsp;{value}&nbsp;
                {key === 'fontFamily' ? <Logos logo='link' href={fontHref} /> : null}
            </div>
        )
    }));

    return (
        <div className={`${name}-container`} id='font-card'>
                <div id="liContainer" className='li-font'>
                    <div id="font-heading" value={data.id} onClick={hightLightFontOnPage}>{element}</div>
                    {styles}
                </div>
        </div>
    )

}

export const createColorElement = (name, prop) => {
    const [style, data] = prop;
    const setTextColor = (style) => {
        const rgbValue = splitRgb(style);
        var color = Math.round(((parseInt(rgbValue[0]) * 299) +
            (parseInt(rgbValue[1]) * 587) +
            (parseInt(rgbValue[2]) * 114)) / 1000);
        return (color > 125) ? 'black' : 'white';
    }

    return (
            <div className={`${name}-container`} style={{ background: `${rgbToHex(style)}` }}>
                <div id="liContainer" className='li-color' style={{ color: setTextColor(style)}}>
                    <div id="hexDiv" className="mr pointer" onClick={copyToClipboard}>{rgbToHex(style)}</div>
                    <div id="listItem" className="mr pointer" onClick={copyToClipboard}>{style}</div>
                    <p id="listDesc">used {data.count} time(s)</p>
                </div>
            </div>
    )};


export const createImgSrcElement = (name, prop) => {
    const { currentTab } = useGetterContext();
    const [, image] = prop;
    // console.log('DATA', image)

    const getImageSrc = (imageSrc) => {
        if (imageSrc.includes('http')) {
            return imageSrc;
        }

        return `${currentTab.url}${imageSrc}`;
    }
    
    return (
        <div className={`${name}-container`}>
            <img id="imageDiv" className="mr pointer" src={getImageSrc(image.src)} onClick={downloadImage} />
            <p id="imageDesc">{image.name}</p>;
        </div>
    )

}

export const createBgImageElement = (name, prop) => {
    const [, data] = prop;
    return (
        <div className={`${name}-container`}>
        <div id='liContainer'>
            <img id="bgDiv" className="mr pointer" style={{ backgroundImage: `${data.style[0]}`}} onClick={() => downloadImage(e, data.style[0])} />
            <p id="listDesc"></p>
        </div>
        </div>
    )};

export const createDefaultElement = (name, prop) => {
    const [style] = prop;
    return (
        <div className={`${name}-container`}>
        <div id='liContainer'>
            <div id="listItem">{style}</div>
        </div>
        </div>
    )};

export const noItemsElement = (name) => {
    return (
        <div className={`${name}-container`}>
            <div id='liContainer'>
                <div id="listItem"> No {name} items found </div>
            </div>
        </div>
    )
};