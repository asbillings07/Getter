import React, { Children } from 'react';
import { copyToClipboard, rgbToHex, hightLightFontOnPage, downloadImage, splitRgb } from './helperFunctions';
import { Tooltip } from 'react-tooltip';
import { Logos } from '../src/components/Logos';

export const FontElement = (name, prop) => {
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

export const ColorElement = (name, prop) => {
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
                <div id="hexDiv" data-tooltip-id="color-div-tooltip-click" data-tooltip-delay-hide={1000} data-tooltip-variant="success" className="mr pointer" onClick={copyToClipboard}>{rgbToHex(style)}</div>
                <div id="listItem" data-tooltip-id="color-div-tooltip-click" data-tooltip-delay-hide={1000} data-tooltip-variant="success" className="mr pointer" onClick={copyToClipboard}>{style}</div>
                <p id="listDesc">used {data.count} time(s)</p>
            </div>
            <Tooltip
                id="color-div-tooltip-click"
                content="Color copied to clipboard!"
                openOnClick={true}
            />
            </div>
    )};


export const ImageElement = (name, prop) => {
    const [, image] = prop;
    
    const getImageSize = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return `${Math.floor(blob.size / 1024)}MB`
    };

    getImageSize(image.src).then(size => {
        image.size = size;
    })

    
    return (
        <div className={`${name}-container`} onClick={() => downloadImage(image.src)} >
                <img 
                    loading='lazy'
                    id="image-div"
                    src={image.src}
                    alt={image.name} 
                />
                <div id='image-overlay'>
                    <Logos logo='download_icon' />
                    <div id='image-name'>
                        {image.name}
                    </div>
                    <div id='image-size'>
                        {image.size}
                    </div>
                </div>
        </div>
    )

}

export const BgImageElement = (name, prop) => {
    const [, data] = prop;
    return (
        <div className={`${name}-container`}>
        <div id='liContainer'>
            <img id="bgDiv" className="mr pointer" style={{ backgroundImage: `${data.style[0]}`}} onClick={() => downloadImage(e, data.style[0])} />
            <p id="listDesc"></p>
        </div>
        </div>
    )};

export const DefaultElement = (name, prop) => {
    const [style] = prop;
    return (
        <div className={`${name}-container`}>
        <div id='liContainer'>
            <div id="listItem">{style}</div>
        </div>
        </div>
    )};

export const NoItemsElement = (name) => {
    const noImages = (
        <div id='liContainer'>
            <div id="listItem">
                <Logos logo='no_images' />
                There are No Images Found 
            </div>
        </div>
    )
    const noFonts = (
        <div id='liContainer'>
            <div id="listItem">
                <Logos logo='no_fonts' />
                There are No Fonts Found 
            </div>
        </div>
    )
    const noColors = (
        <div id='liContainer'>
            <div id="listItem">
                <Logos logo='no_colors' />
                There are No Colors Found 
            </div>
        </div>
    )

    const getNoItems = (name) => {
        switch (name) {
            case 'images':
                return noImages;
            case 'fonts':
                return noFonts;
            case 'colors':
                return noColors;
            default:
                return null;
        }
    }

    return (
        <div className={`${name}-container`}>
            {getNoItems(name)}
        </div>
    )
};