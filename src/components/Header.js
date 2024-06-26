import React from 'react'
import { Logos } from './Logos'
import { downloadAllImages } from '../utils'
import { useGetterContext } from '../Store'

export const Header = () => {
  return (
    <div className='header'>
      <Logos logo='header' />
    </div>
  )
}

export const ViewHeader = ({ title, downloadAll = false }) => { 
  const { cssData } = useGetterContext();
  return (
    <div className='h1-container'>
      <div className='title-container'>
        <h1>{title}</h1>
        { downloadAll && <Logos logo='download' onclick={() => downloadAllImages(cssData['images'])} /> }
      </div>
      <div className='divider'></div>
    </div>
  )
}
