import React from 'react'
import { useGetterContext } from '../Store'
import { ViewHeader } from '../components/Header'

export const InfoView = () => {
    const INFO = 'info'
    const { propName } = useGetterContext()

    const shouldRender = INFO === propName

  return shouldRender && (
    <>
        <ViewHeader title={INFO.toUpperCase()} />
        <div>InfoView</div>
    </>
  )
}
