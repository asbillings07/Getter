import React, { useState } from 'react';
import { setItem, getItem, createNotification } from '../../utils/helperFunctions'
        export const Options = () => {
            const [settings, setSettings] = useState([])
            
                const getLabelName = (cssName) =>
                ({
                    backgroundColor: 'Background Color',
                    color: 'Color',
                    fontFamily: 'Font Family',
                    fontWeight: 'Font Weight',
                    fontSize: 'Font Size',
                    imageSource: 'Image Source',
                    backgroundImage: 'Background Image'
                }[cssName])

                function regClick(e) {
                    const checked = e.target.checked
                    const settingId = e.target.id
                    if (checked) {
                        if (!settings.includes(settingId)) {
                            setSettings([...settings, settingId])
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
                    setItem({ cssGetters: settings }, () => {
                        createNotification('Settings Saved Successfully', 'The settings have been updated and will take effect the next time you use the extension.')
                    })
                }

                const saveButton = document.getElementById('save')


                getItem('cssGetters', ({ cssGetters }) => {
                    settings = cssGetters
                    settings.forEach(setting => {
                        document.getElementById(setting).checked = true
                    })
                })

                saveButton.addEventListener('click', saveSettings)

            const createCheckBoxes = () => {
                const labels = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'imageSource', 'backgroundImage']
                return labels.map(label => {
                    const labelName = getLabelName(label)
                    return (
                        <div>
                            <label className="label" htmlFor={label}>{labelName}</label>
                            <input onChange={regClick} type="checkbox" id={label} />
                        </div>
                    )
                })
            }

            return (
                <div>
                    <h4>What CSS properties would you like to search for? (check all that apply)</h4>
                    <div id="anchor">
                        {createCheckBoxes()}
                    </div>
                    <div>
                        <button onClick={saveSettings} id="save">Save settings</button>
                    </div>
                </div>
            );
        };