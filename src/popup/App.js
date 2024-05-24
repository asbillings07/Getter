import React from 'react'
import { Header, Sidebar } from '../components'
import { Popup } from './Popup'

export const App = () => {

  return (
    <div className='main'>
        <Header />
        <div className='main-container'>
        <Sidebar/>
        <Popup/>
        </div>
    </div>
  )
}