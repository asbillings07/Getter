import React from 'react'
import { Logos } from './Logos'
export const Sidebar = () => {
  return (
    <div className='sidebar'>
      <Logos logo='fonts' />
      <Logos logo='colors' />
      <Logos logo='images' />
    </div>
  )
}