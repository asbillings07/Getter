import React from 'react'
import { Header, Sidebar, Popup, AlertMessage } from '../components'

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