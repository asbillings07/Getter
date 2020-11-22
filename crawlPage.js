(function () {

    const values = ['fontFamily', 'fontWeigtht', 'backgroundColor']

    function styleInPage(css, verbose = false){
        if(typeof window.getComputedStyle== "undefined")
        window.getComputedStyle = function(elem){
            return elem.currentStyle;
        }
        const nodes = document.body.getElementsByTagName('*')
        const values = []
        console.log(nodes.length)
       Array.from(nodes).forEach((nodeElement, i) => {
            if(nodeElement.style){
                const outputElement = '#'+(nodeElement.id || nodeElement.nodeName+'('+i+')');
                const elementStyle = getComputedStyle(nodeElement, '')[css];

                if(elementStyle){
                    
                    if (verbose) {
                        values.push([outputElement , elementStyle]);
                    } else if(values.indexOf(elementStyle)== -1) {
                        values.push(elementStyle);
                    }
                }

                const val_before = getComputedStyle(nodeElement, ':before')[css];
                if(val_before){

                    if (verbose) { 
                        values.push([outputElement , val_before]); }
                    else if(values.indexOf(val_before)== -1) { 
                        values.push(val_before);
                    }
                }

                const val_after= getComputedStyle(nodeElement, ':after')[css];
                if(val_after){

                    if(verbose) {
                        values.push([outputElement , val_after]);
                    } else if(values.indexOf(val_after)== -1) {
                        values.push(val_after);
                    }
                }
            }
        })

        return values;
    }

    function getValuesFromPage(values, styleInPage) {
        const valueObj = {}
        values.forEach(value => {
            valueObj[value] = styleInPage(value)
        })

        chrome.runtime.sendMessage({ state: valueObj }, function(response) {
            console.log(response);
          });
        return valueObj
    }

    

    getValuesFromPage(values, styleInPage)
  

    
    // getItem('state', ({ state }) => {

    // })

// function getAllCss() {
//     var file = document.getElementById('css');
//     console.log(file.sheet.cssRules)
//     return Array.prototype.map.call(file.sheet.cssRules, (file) => file.cssText)
// }

// getAllCss()



    function getItem(item, func = (data) => console.log(data)) {
        chrome.storage.sync.get(item, func)
      }
    function setItem(item, func = () => false) {
        chrome.storage.sync.set(item)
      }
    

}())