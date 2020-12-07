export default (function () {
  function renderEl (element, container) {
    let dom

    if (element.nodeType === 'TEXT_ELEMENT') {
      dom = document.createTextNode('')
    } else if (typeof element.nodeType === 'object') {
      console.log(element)
      dom = document.createElement(element.nodeType.nodeType)
    } else {
      dom = document.createElement(element.nodeType)
    }
    // const dom =
    //   element.nodeType === 'TEXT_ELEMENT'
    //     ?
    //     : document.createElement(element.nodeType)

    const isProperty = key => key !== 'children'
    Object.keys(element.props)
      .filter(isProperty)
      .forEach(name => {
        dom[name] = element.props[name]
      })

    element.props.children.forEach(child => {
      return renderEl(child, dom)
    })

    container.appendChild(dom)
    return container
  }

  function createElement (nodeType, props, ...children) {
    return {
      nodeType,
      props: {
        ...props,
        children: children.map(child => {
          return typeof child === 'object' ? child : createTextElement(child)
        })
      }
    }
  }

  function createTextElement (text) {
    return {
      type: 'TEXT_ELEMENT',
      props: {
        nodeValue: text,
        children: []
      }
    }
  }

  return { createElement, renderEl }
}())