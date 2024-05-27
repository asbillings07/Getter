import React from 'react'
import { Logos } from './Logos'
import { downloadAllImages } from '../utils'

export const Header = () => {
  return (
    <div className='header'>
      <Logos logo='header' />
    </div>
  )
}

export const ViewHeader = ({ title, downloadAll = false }) => { 
  return (
    <div className='h1-container'>
      <div>
        <h1>{title}</h1>
        { downloadAll && <Logos logo='download' onclick={() => downloadAllImages(cssData['images'])} /> }
      </div>
      <div className='divider'></div>
    </div>
  )
}
