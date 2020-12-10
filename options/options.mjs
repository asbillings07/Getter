import helpers from '../utils/helperFunctions.mjs'

(function () {
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

  const { setItem, getItem, createNotification } = helpers
  const anchor = document.getElementById('anchor')

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
    console.log(settings)
    setItem({ cssGetters: settings }, () => {
      createNotification('Settings Saved Successfully', 'The settings have been updated and will take effect the next time you use the extension.')
    })
  }

  const saveButton = document.getElementById('save')
  // const bgColor = document.getElementById('backgroundColor')
  // const color = document.getElementById('color')
  // const fontFamily = document.getElementById('fontFamily')
  // const fontSize = document.getElementById('fontSize')
  // const fontWeight = document.getElementById('fontWeight')
  // const backgroundImage = document.getElementById('backgroundImage')

  const elementArr = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'imageSource', 'backgroundImage']

  elementArr.forEach(el => {
    createCheckbox(el, getLabelName(el))
  })

  getItem('cssGetters', ({ cssGetters }) => {
    settings = cssGetters
    settings.forEach(setting => {
      console.log(setting)
      document.getElementById(setting).checked = true
    })
  })

  saveButton.addEventListener('click', saveSettings)

  function createCheckbox (id, labelName) {
    const div = document.createElement('div')
    const label = document.createElement('label')
    const input = document.createElement('input')

    label.className = 'label'
    label.htmlFor = id
    label.textContent = labelName
    input.type = 'checkbox'
    input.id = id
    input.addEventListener('change', regClick)

    div.appendChild(label)
    div.appendChild(input)
    anchor.appendChild(div)
  }
}())
