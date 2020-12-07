import helpers from '../utils/helperFunctions.mjs'
import './options.css';

(function () {
  const { setItem, getItem, createNotification } = helpers

  let settings

  function regClick (e) {
    const checked = e.target.checked
    const settingId = e.target.id
    if (checked) {
      if (!settings.includes(settingId)) {
        settings.push(settingId)
      }
    }

    if (!checked) {
      if (settings.includes(settingId)) {
        settings = settings.filter(setting => setting !== settingId)
      }
    }
  }

  function saveSettings (e) {
    setItem({ cssGetters: settings }, () => {
      createNotification('Settings Saved Successfully', 'The settings have been updated and will take effect the next time you use the extension.')
    })
  }

  const saveButton = document.getElementById('save')
  const bgColor = document.getElementById('backgroundColor')
  const color = document.getElementById('color')
  const fontFamily = document.getElementById('fontFamily')
  const fontSize = document.getElementById('fontSize')
  const fontWeight = document.getElementById('fontWeight')

  const elementArr = [bgColor, color, fontFamily, fontSize, fontWeight]

  elementArr.forEach(el => {
    el.addEventListener('change', regClick)
  })

  getItem('cssGetters', ({ cssGetters }) => {
    settings = cssGetters
    settings.forEach(setting => {
      document.getElementById(setting).checked = true
    })
  })
  if (saveButton !== null) saveButton.addEventListener('click', saveSettings)
}())
