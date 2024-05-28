import React, { Children, useEffect } from 'react'

export const ImageLoader = ({ setShowButton }) => {
    useEffect(() => {
        setShowButton(false)
        return () => {
            setShowButton(true)
        }
    }, [])


    const createLoaders = () => {
        return Children.toArray([1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
            <div className='skeleton-image'></div>
        )))
    }
  return (
      <div className='main-images-container'>
        {createLoaders()}
    </div>
  )
}
