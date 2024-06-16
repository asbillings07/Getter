import React, { Children } from 'react'
import { useGetterContext } from '../Store'
import { setItem, movePropertyToTop } from '../utils'
import { ViewHeader } from '../components/Header'

export const SettingsView = () => {
    const SETTINGS = 'settings'
    const { propName, cssOptions, setCssOptions } = useGetterContext()

    const shouldRender = SETTINGS === propName

    const getReadableName = (option) => {
        return {
            'fontFamily': 'font families',
            'fontWeight': 'font weight',
            'fontSize': 'font size',
            'letterSpacing': 'letter spacing',
            'lineHeight': 'line height',
            'hex': 'hex values',
            'fileSize': 'file size',
            'buttonColor': 'button background color',
            'imageDimensions': 'image dimensions',
            'detailed': 'detailed font view'
        }[option]
    }

    const getOptionName = (option) => {
        return {
            'fontFamily': 'fonts',
            'detailed': 'fonts',
            'fontWeight': 'fonts',
            'fontSize': 'fonts',
            'letterSpacing': 'fonts',
            'lineHeight': 'fonts',
            'hex': 'colors',
            'buttonColor': 'colors',
            'fileSize': 'images',
            'imageDimensions': 'images'
        }[option]
    }

    function handleClick(e) {
        const checked = e.target.checked
        const settingId = e.target.id

        setCssOptions((prevState) => {
            const newOptions = {
                ...prevState,
                [getOptionName(settingId)]: {
                    ...prevState[getOptionName(settingId)],
                    [settingId]: checked
                }
            }
            setItem({'cssGetterOptions': newOptions})
            return newOptions
        })
    }

    const showOptions = (options) => {
        return Children.toArray(Object.entries(options).map(([option, optionData]) => {
            return (
                <div className='option-container'>
                    <legend>{option.toUpperCase()}</legend>
                    {Children.toArray(Object.entries(optionData).map(([key, value], i) => (
                        <div className='option'>
                            <input onChange={handleClick} data-name={key} name={`${key}-${i}`} checked={value} type="checkbox" id={key} />
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
          <fieldset>
                {showOptions(movePropertyToTop(cssOptions, 'fonts'))}
          </fieldset>
      </>
  )
}
