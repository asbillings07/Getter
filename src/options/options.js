import { setItem, getItem, createNotification, hasNodeRenderedBefore } from '../utils/helperFunctions.js'


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

const anchor = document.getElementById('anchor')

let settings = []

function regClick(e) {
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

function saveSettings(e) {
  setItem({ cssGetters: settings }, () => {
    createNotification({ title: 'Settings Saved Successfully', message: 'The settings have been updated and will take effect the next time you use the extension.' })
  })
}

const saveButton = document.getElementById('save')
const options = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'imageSource', 'backgroundImage'];

options.forEach(el => {
  createCheckbox(el, getLabelName(el))
})

getItem('cssGetters', ({ cssGetters }) => {
  settings = cssGetters
  settings.forEach(setting => {
    document.getElementById(setting).checked = true
  })
})

saveButton.addEventListener('click', saveSettings)

function createCheckbox(id, labelName) {
  if (!hasNodeRenderedBefore(`${labelName} - ${id}`)) {

    const div = document.createElement('div')
    div.id = `${labelName} - ${id}`
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
}

