import React from 'react'
import { Logos } from './Logos'
import { useGetterContext } from '../Store'
export const Sidebar = () => {
  const { error } = useGetterContext()
  return (
    <div className='sidebar'>
      <Logos logo='fonts' disabled={error.state} />
      <Logos logo='colors' disabled={error.state}  />
      <Logos logo='images' disabled={error.state}  />
      <div id='settings-support-container'>
        <Logos logo='support' disabled={error.state} />
        <Logos logo='settings' disabled={error.state}  />
      </div>
    </div>
  )
}