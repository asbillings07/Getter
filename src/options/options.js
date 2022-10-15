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

const anchor = document.getElementById('anchor');
const highlightAnchor = document.getElementById('anchor-highlight');

let settings = await getSettings();

function regClick (e) {
  const checked = e.target.checked;
  const settingId = e.target.getAttribute('data-id');
  if (checked) {
    if (!settings.includes(settingId)) {
      settings.push(settingId);
    }
  }

  if (!checked) {
    if (settings.includes(settingId)) {
      settings = settings.filter(setting => setting !== settingId);
    }
  }
}
const toggle = (source, boolean) => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkBox => {
    if (checkBox !== source) {
      checkBox.checked = boolean;
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
  settings = await setSettings(settings);
  if (settings) {
    createNotification({ title: 'Settings Saved Successfully', message: 'The settings have been updated and will take effect the next time open Getter.' });
  }

}

async function getSettings () {
  const { cssValues } = await sendMessage({ action: 'getCSSValues', payload: null });
  return cssValues;
}

async function setSettings (settings) {
  const updatedSettings = await chrome.runtime.sendMessage({ action: 'setCSSValues', payload: settings });
  return updatedSettings
}

const saveButton = document.getElementById('save');
const radioOptions = ['blue', 'yellow', 'red', 'orange', 'purple'];
const cssOptions = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'imageSource', 'backgroundImage', 'checkAll'];
cssOptions.forEach(el => createInput(el, getLabelName(el), 'checkbox', anchor));

radioOptions.forEach((color, i) => createInput(i, color, 'radio', highlightAnchor));
settings.forEach(setting => {
  document.getElementById(getLabelName(setting)).checked = true;
});


saveButton.addEventListener('click', saveSettings);

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

    if (type == 'checkbox') {
      input.name = 'style';

      if (labelName !== 'Check All?') {
        input.addEventListener('change', regClick);
      } else {
        input.addEventListener('change', toggleCheckAll);
      }

    } else {
      input.name = 'color';
      div.className = 'radio-option';
    }

    input.value = labelName;
    input.id = labelName;
    input.dataset.id = `${id}`



    div.appendChild(label);
    div.appendChild(input);
    rootEl.append(div);
  }
}

