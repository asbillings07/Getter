import { setItem, getItem, sendMessage, createNotification, hasNodeRenderedBefore, grabItem } from '../utils/helperFunctions.js';
import "regenerator-runtime/runtime.js";

const getLabelName = (cssName) =>
({
  backgroundColor: 'Background Color',
  color: 'Color',
  fontFamily: 'Font Family',
  fontWeight: 'Font Weight',
  fontSize: 'Font Size',
  imageSource: 'Image Source',
  backgroundImage: 'Background Image',
  checkAll: 'Check All?'
}[cssName]);

const checkAllBox = document.querySelector('input[id="Check All?"]')
checkAllBox.addEventListener('click', toggleCheckAll)

const saveButton = document.getElementById('save');
saveButton.addEventListener('click', saveSettings);

const anchor = document.getElementById('anchor');
const highlightAnchor = document.getElementById('anchor-highlight');
const cssOptions = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'imageSource', 'backgroundImage'];
const radioOptions = ['blue', 'yellow', 'red', 'orange', 'purple'];

const settings = await getSettings();

setCheckboxOptions()
setRadioOptions()

function handleCheckBoxChange (e) {
  onCheckboxClick(e)
  checkForAll()
}
function onCheckboxClick (e) {
  const checked = e?.checked ?? e.target.checked;
  const settingId = getId(e, 'data-id')

  if (settingId === 'checkAll') return

  if (checked) {
    if (!settings.css.includes(settingId)) {
      settings.css.push(settingId);
    }
  }

  if (!checked) {
    if (settings.css.includes(settingId)) {
      settings.css = settings.css.filter(setting => setting !== settingId);
    }
  }

  checkForAll()
}

function handleRadioChange (e) {
  const checked = e.target.checked
  const settingColor = e.target.id
  settings.color = settingColor
}

const getId = (event, id) => {
  if (event.getAttribute) return event.getAttribute(id)
  if (event.target.getAttribute) return event.target.getAttribute(id)
}

const toggle = (source, boolean) => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkBox => {
    if (checkBox !== source) {
      checkBox.checked = boolean;
      onCheckboxClick(checkBox)
    }
  });
};

function toggleCheckAll (source) {
  if (source.target.checked) {
    toggle(source, true);
  } else {
    toggle(source, false);
  }
}

async function saveSettings (e) {
  console.log('target', e.target);
  console.log('SETTINGS', settings);
  if (settings.css.length > 0) {
    await setSettings(settings);
    createNotification({ title: 'Settings Saved Successfully', message: 'The settings have been updated and will take effect the next time open Getter.' });
  }
}

async function getSettings () {
  const { cssValues } = await sendMessage({ action: 'getCSSValues', payload: null });
  return cssValues
}

async function setSettings (settings) {
  const updatedSettings = await chrome.runtime.sendMessage({ action: 'setCSSValues', payload: settings });
  return updatedSettings
}



function setRadioOptions () {
  radioOptions.forEach((color, i) => createInput(i, color, 'radio', highlightAnchor));
  document.querySelector(`input[id='${settings.color}']`).checked = true;
}

function setCheckboxOptions () {
  cssOptions.forEach(el => createInput(el, getLabelName(el), 'checkbox', anchor));
  settings.css.forEach(setting => {
    document.getElementById(getLabelName(setting)).checked = true;
  });
  checkForAll()
}

function checkForAll () {
  const checks = Array.from(document.querySelectorAll('input[type="checkbox"]')).filter(box => box.id !== 'Check All?' && box.checked === true)
  if (checks.length === cssOptions.length) {
    checkAllBox.checked = true
  } else {
    checkAllBox.checked = false
  }

  enabledSaveButton(checks)
}

function enabledSaveButton (checks) {
  if (checks.length <= 0) {
    saveButton.disabled = true;
  } else {
    saveButton.disabled = false
  }
}

function createInput (id, labelName, type, rootEl) {
  if (!hasNodeRenderedBefore(`${labelName} - ${id}`)) {
    const div = document.createElement('div');
    div.id = `${labelName} - ${id}`;
    const label = document.createElement('label');
    const input = document.createElement('input');

    label.className = 'label';
    label.htmlFor = labelName;
    label.textContent = labelName;

    input.type = type;
    input.value = labelName;
    input.id = labelName;

    switch (type) {
      case 'checkbox': {
        input.name = 'style';
        input.dataset.id = `${id}`
        input.addEventListener('change', handleCheckBoxChange);
        break
      }

      case 'radio': {
        input.name = 'color';
        div.className = 'radio-option';
        input.addEventListener('change', handleRadioChange)
        break;
      }

      default:
        break
    }

    div.appendChild(label);
    div.appendChild(input);
    rootEl.appendChild(div);
  }
}

