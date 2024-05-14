import React, { useState } from 'react'
import { Header, Sidebar, Popup } from '../components'


export const App = () => {
  const [propName, setPropName] = useState('backgroundColor')

  return (
    <div className='main'>
        <Header />
        <div className='main-container'>
        <Sidebar setPropName={setPropName}/>
        <Popup propName={propName}/>
        </div>
    </div>
  )
}