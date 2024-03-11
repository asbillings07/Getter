/* global chrome */

  function getItem (item, func = (data) => false) {
    chrome.storage.local.get(item, func)
  }
  function setItem (item, func = () => false) {
    chrome.storage.local.set(item, func)
  }

function createNotification(title, message, buttons = false, interaction = false) {
  const options = {
    type: 'basic',
    iconUrl: '../images/CSS-Getter-Icon-16px.png',
    title: title,
    message: message,
    requireInteraction: interaction
  };
  if (buttons) {
    options.buttons = buttons;
  }
  chrome.notifications.create(options);
}

const createColorElement = ({ freq, style, rgbToHex, copyToClipboard }) => {
  return (
    <div id="liContainer">
      <div id="colorDiv" className="mr pointer" style={`background-color: ${rgbToHex(style)}`} onclick={copyToClipboard}></div>
      <div id="listItem" className="mr pointer" onclick={copyToClipboard}>{style}</div>
      <div id="hexDiv" className="mr pointer" onclick={copyToClipboard}>{rgbToHex(style)}</div>
      <p id="listDesc">used {freq.style.length} time(s)</p>
    </div>
  )
};

const createFontElement = ({ freq, style, hightLightFontOnPage }) => {
  return (
    <div id="liContainer">
      <div id="fontItem" className="pointer" value={freq.id} onclick={hightLightFontOnPage}>{style}</div>
    </div>
  )
};

const createImgSrcElement = ({ freq, downloadImage }) => {

  return freq.images.filter(i => i !== 'images').map((image) => {
    return (
      <div className='container'>
        <img id="imageDiv" className="mr pointer" src={image.single.src} onclick={downloadImage} />
        <p id="imageDesc">{image.single.name}</p>
      </div>
    );
  })

}

const createBgImageElement = ({ freq, downloadImage }) => {

  return (
    <div id='liContainer'>
      <img id="bgDiv" className="mr pointer" style={`background-image: ${freq.style[0]}`} onclick={() => downloadImage(e, freq.style[0])} />
      <p id="listDesc"></p>
    </div>
  )
};
const createDefaultElement = (elObj) => {
  const { style } = elObj;

  return (
    <div id='liContainer'>
      <div id="listItem">{style}</div>
    </div>
  )
};


  export {
    getItem,
    setItem,
    createNotification,
  createColorElement,
  createFontElement,
  createImgSrcElement,
  createBgImageElement,
  createDefaultElement
  }