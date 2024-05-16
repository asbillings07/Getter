import React, { Children } from 'react';
import { copyToClipboard, rgbToHex, hightLightFontOnPage, downloadImage, splitRgb } from './helperFunctions';

export const createColorElement = (name, prop) => {
    const [style, freq] = prop;

    const setTextColor = (style) => {
        const rgbValue = splitRgb(style);
        var color = Math.round(((parseInt(rgbValue[0]) * 299) +
            (parseInt(rgbValue[1]) * 587) +
            (parseInt(rgbValue[2]) * 114)) / 1000);
        return (color > 125) ? 'black' : 'white';
    }

    return (
            <div className={`${name}-container`} style={{ background: `${rgbToHex(style)}` }}>
                <div id="liContainer" style={{ color: setTextColor(style)}}>
                    <div id="hexDiv" className="mr pointer" onClick={copyToClipboard}>{rgbToHex(style)}</div>
                    <div id="listItem" className="mr pointer" onClick={copyToClipboard}>{style}</div>
                    <p id="listDesc">used {freq.style.length} time(s)</p>
                </div>
            </div>
    )};

export const createFontElement = (name, prop) => {
    const [style, freq] = prop;
    return (
        <div className={`${name}-container`}>
        <div id="liContainer">
            <div id="fontItem" className="pointer" value={freq.id} onClick={hightLightFontOnPage}>{style}</div>
        </div>
        </div>
    )};

export const createImgSrcElement = (name, prop) => {
    const [, freq] = prop;
    console.log('FREQ: ', freq)
    const images = Children.toArray(freq.images.filter(i => i !== 'images' && i !== null).map((image) => {
        console.log('IMAGE: ', image)
        return (
            <div className='container'>
                <img id="imageDiv" className="mr pointer" src={image?.single?.src} onClick={downloadImage} />
                <p id="imageDesc">{image.single.name}</p>
            </div>
        )}))

        return (
            <div className={`${name}-container`}>
                {images}
            </div>
        )

}

export const createBgImageElement = (name, prop) => {
    const [, freq] = prop;
    return (
        <div className={`${name}-container`}>
        <div id='liContainer'>
            <img id="bgDiv" className="mr pointer" style={{ backgroundImage: `${freq.style[0]}`}} onClick={() => downloadImage(e, freq.style[0])} />
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