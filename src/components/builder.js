import React from 'react';
import { copyToClipboard, rgbToHex, hightLightFontOnPage, downloadImage } from '../../utils/helperFunctions';

export const createColorElement = ([style, freq]) => {
    return (
        <div id="liContainer">
            <div id="colorDiv" className="mr pointer" style={{ backgroundColor: `${rgbToHex(style)}` }} onClick={copyToClipboard}></div>
            <div id="listItem" className="mr pointer" onClick={copyToClipboard}>{style}</div>
            <div id="hexDiv" className="mr pointer" onClick={copyToClipboard}>{rgbToHex(style)}</div>
            <p id="listDesc">used {freq.style.length} time(s)</p>
        </div>
    )};

export const createFontElement = ([style, freq]) => {
    return (
        <div id="liContainer">
            <div id="fontItem" className="pointer" value={freq.id} onClick={hightLightFontOnPage}>{style}</div>
        </div>
    )};

export const createImgSrcElement = ([, freq]) => {

    return freq.images.filter(i => i !== 'images').map((image) => (
            <div className='container'>
                <img id="imageDiv" className="mr pointer" src={image.single.src} onClick={downloadImage} />
                <p id="imageDesc">{image.single.name}</p>
            </div>
        ))

}

export const createBgImageElement = ([, freq]) => {
    return (
        <div id='liContainer'>
            <img id="bgDiv" className="mr pointer" style={{ backgroundImage: `${freq.style[0]}`}} onClick={() => downloadImage(e, freq.style[0])} />
            <p id="listDesc"></p>
        </div>
    )};

export const createDefaultElement = ([style]) => {
    return (
        <div id='liContainer'>
            <div id="listItem">{style}</div>
        </div>
    )};