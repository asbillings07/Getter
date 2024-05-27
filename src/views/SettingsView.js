import React, { Children, useEffect } from 'react'
import { useGetterContext } from '../Store'
import { ViewHeader } from '../components/Header'

export const SettingsView = () => {
    const SETTINGS = 'settings'
    const { propName, cssOptions, setCssOptions } = useGetterContext()

    const shouldRender = SETTINGS === propName

    useEffect(() => {
        console.log('SETTINGS VIEW', { cssOptions })
    }, [cssOptions])

    const getReadableName = (option) => {
        console.log('OPTION', option)
        return {
            'fontFamily': 'font families',
            'fontWeight': 'font weight',
            'fontSize': 'font size',
            'letterSpacing': 'letter spacing',
            'lineHeight': 'line height',
            'rgb': 'rgb(a) values',
            'hex': 'hex values',
            'fileSize': 'file size',
            'buttonColor:': 'button color',
            'ImageDimensions': 'image dimensions',
        }[option]
    }

    function regClick(e) {
        const checked = e.target.checked
        const settingId = e.target.id
        const optionName = e.target.dataset.name

        console.log('SETTINGS VIEW', { target: e.target, settingId, optionName, checked })
        setCssOptions((prevState) => ({
            ...prevState,
            [optionName]: {
                [settingId]: checked
            }
        }))
    }

    const showOptions = (options) => {
        return Children.toArray(Object.entries(options).map(([option, optionData]) => {
            return (
                <div className='option-container'>
                    <label>{option.toUpperCase()}</label>
                    {Children.toArray(Object.entries(optionData).map(([key, value]) => (
                        <div className='option'>
                            <input onChange={regClick} data-name='fonts' value={value} type="checkbox" id={key} />
                            <label className="label" htmlFor={key}>{`Show ${getReadableName(key)}`}</label>
                        </div>
                    )))}
                </div>
            )
        }))

    }

  return shouldRender && (
      <>
          <ViewHeader title={SETTINGS.toUpperCase()} />
          <div>
                {showOptions(cssOptions)}
          </div>
      </>
  )
}
