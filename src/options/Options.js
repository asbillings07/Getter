// todo FIX ME, I don't work. lol

/*
Options:

 Fonts:
- fontStyles
- Element Tags


 Colors:
  -hex
  -hsl radio buttons


 Images:
 - Download All?
 - Image Size
 - Image Height & Width

*/
import React, { useState } from 'react';
import { setItem, getItem, createNotification } from '../utils'
        export const Options = () => {
            const [settings, setSettings] = useState(null)
            

                function regClick(e) {
                    const checked = e.target.checked
                    const settingId = e.target.id
                    if (checked) {
                        if (!settings.includes(settingId)) {
                            setSettings((prevState) => [...prevState, settingId])
                        }
                    }

                    if (!checked) {
                        if (settings.includes(settingId)) {
                            const filteredSetting = settings.filter(setting => setting !== settingId)
                            setSettings(filteredSetting)
                        }
                    }
                }

                function saveSettings() {
                    setItem({ cssGetterOptions: settings }, () => {
                        createNotification('Settings Saved Successfully', 'The settings have been updated and will take effect the next time you use the extension.')
                    })
                }


                getItem('cssGetterOptions', ({ cssGetterOptions }) => {
                    if (!settings) {
                        console.log(cssGetterOptions)
                        setSettings(cssGetterOptions)
                    }
                })

            const createCheckBoxes = (labels) => {
                return labels.map(label => {
                    return (
                        <div>
                            <label className="label" htmlFor={label}>{label}</label>
                            <input onChange={regClick} type="checkbox" id={label} />
                        </div>
                    )
                })
            }

            return (

                <div>
                    <h4>What CSS properties would you like to search for? (check all that apply)</h4>
                    {
                       settings ? ( <>
                            <div className='font-container'>
                                <div>Fonts:</div>
                                <div>
                                    {createCheckBoxes(settings['fonts'].elementTags)}
                                </div>
                                <div>
                                    {createCheckBoxes(settings['fonts'].fontStyles)}
                                </div>
                            </div>
                            <div className='image-container'>
                                <div>Images:</div>
                                <div>
                                    {createCheckBoxes(Object.keys(settings['images']))}
                                </div>
                            </div>
                        </>) : null
                    }
                    <div>
                        <div></div>
                        <div></div>
                    </div>
                    <div>
                        <div></div>
                        <div></div>
                    </div>
                    <div>
                        <button onClick={saveSettings} id="save">Save settings</button>
                    </div>
                </div>
            );
        };