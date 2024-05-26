import React, { Children } from 'react'
import { useGetterContext } from '../Store';
import { Logos } from '../components/Logos';
import { downloadAllImages, downloadImage } from '../../utils';

export const ImageView = () => {
    const { cssData, propName } = useGetterContext()
    const IMAGES = 'images'

    const imageData = cssData?.images

    const shouldRender = propName === IMAGES && imageData

    const getImageSize = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return `${Math.floor(blob.size / 1024)}MB`
    };

    return shouldRender && (
        <>
            <div className='h1-container'>
                <h1>{IMAGES.toUpperCase()}</h1>
                <Logos logo='download' onclick={() => downloadAllImages(cssData['images'])} />
            </div>
            <div className='divider'></div>
            <div id={`main-${IMAGES}-container`}>
                {Children.toArray(imageData.map((image) => {

                    getImageSize(image.src).then(size => {
                        image.size = size;
                    })

                    return (
                        <div className={`${IMAGES}-container`} onClick={() => downloadImage(image.src)} >
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
                }))}
            </div>
        </>
    );
}