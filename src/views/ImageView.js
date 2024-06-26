import React, { Children, Suspense, useState } from 'react'
import { useGetterContext } from '../Store';
import { NotFound, ViewHeader, Logos, SuspenseImg, ImageLoader } from '../components';
import { downloadImage } from '../utils';

export const ImageView = () => {
    const { propName, loading, cssData, cssOptions } = useGetterContext()
    const [showButton, setShowButton] = useState(false);
    const IMAGES = 'images'

    const imageOptions = cssOptions?.images
    const imageData = cssData?.images;

    const shouldRender = propName === IMAGES && imageData ? true : false;

    const getImageDimensions = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function () {
                resolve({ width: this.width, height: this.height });
            };
            img.onerror = function () {
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    }

    const getData = (image) => {
        if (!image.dimensions || !imageOptions.imageDimensions) {
            image.dimensions = '';
        }

        if (!image.size || !imageOptions.fileSize) {
            image.size = '';
        }

        return image;
    }

    const cache = {};

    const getImageData = async (image) => {

        if (cache[image.src]) {
            return cache[image.src];
        }

        const res = await fetch(image.src);
        const blob = await res.blob();
        const size = await getImageDimensions(image.src);
        const imageData = {
            dimensions: `${size.width}x${size.height}`,
            size: `${Math.floor(blob.size / 1024)}MB`
        }
        cache[image.src] = imageData
        return imageData;
    };

    const renderImages = () => {

        if (loading) {
            return <div id='spinner'></div>
        }

        if (!imageData) {
            return <NotFound name='images' />
        }

        return Children.toArray(imageData.map((image) => {
            if (image.src.includes('http')) {
                getImageData(image).then((data) => {
                    image = Object.assign(image, data);
                }).catch((error) => {
                    console.error('Failed to load image', error);
                });
            }
            const imageSize = getData(image).size;
            const imageDimensions = getData(image).dimensions;

            return (
                <div className={`${IMAGES}-container`} onClick={() => downloadImage(image.src)} >
                    <SuspenseImg src={image.src} alt={image.name || 'No Name'} />
                    <div id='image-overlay'>
                        <Logos logo='download_icon' />
                        <div id='image-name'>
                            {image.name || 'No Name'}
                        </div>
                        {imageSize || imageDimensions ? (<div id='image-size'>
                            {`${imageDimensions} ${imageSize}`}
                        </div>) : null

                        }
                    </div>
                </div>
            )
        }))

    }

    return shouldRender && (
        <>
            <ViewHeader title={IMAGES.toUpperCase()} downloadAll={showButton} />
            <Suspense fallback={<ImageLoader setShowButton={setShowButton} />}>
                <div id={`main-${IMAGES}-container`}>
                    {renderImages(setShowButton)}
                </div>
            </Suspense>
        </>
    );
}