import React, { Children } from 'react'
import { useGetterContext } from '../Store';
import { Logos } from '../components/Logos';
import { NotFound, ViewHeader } from '../components';
import { downloadImage } from '../utils';

export const ImageView = ({ data }) => {
    const { propName, loading } = useGetterContext()
    const IMAGES = 'images'
    
    const imageData = data?.images

    const shouldRender = propName === IMAGES && imageData ? true : false;

    const getImageSize = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return `${Math.floor(blob.size / 1024)}MB`
    };

    const renderImages = () => {

        if (loading) {
            return <div id='spinner'></div>
        }

        if (!imageData) { 
            return <NotFound />
        }
        
         return Children.toArray(imageData.map((image) => {

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
            }))
        
    }

    return shouldRender && (
        <>
            <ViewHeader title={IMAGES.toUpperCase()} downloadAll={true} />
            <div id={`main-${IMAGES}-container`}>
                {renderImages()}
            </div>
        </>
    );
}