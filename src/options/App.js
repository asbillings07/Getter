import React from 'react'
import { Header } from '../components'
import { Options } from './Options'

export const App = () => {

    return (
        <div className='main'>
            <Header />
            <div className='main-container'>
                <Sidebar />
                <Popup />
            </div>
        </div>
    )
}