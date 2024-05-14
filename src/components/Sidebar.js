import React from 'react'
import { ColorsLogo, FontsLogo, ImagesLogo } from './Logos'
export const Sidebar = () => {
  return (
    <div className='sidebar'>
      <FontsLogo />
      <ColorsLogo />
      <ImagesLogo />
    </div>
  )
}