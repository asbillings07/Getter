import React, { memo } from 'react'
import { Header, Sidebar } from '../components'
import { Popup } from './Popup'

const MemoSideBar = memo(Sidebar)
const MemoHeader = memo(Header)

export const App = () => {

  return (
    <div className='main'>
        <MemoHeader />
        <div className='main-container'>
        <MemoSideBar />
        <Popup/>
        </div>
    </div>
  )
}