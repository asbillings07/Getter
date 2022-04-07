function renderEl(element, container) {
  let dom

  if (element.nodeType === 'TEXT_ELEMENT') {
    dom = document.createTextNode('')
  } else if (typeof element.nodeType === 'object') {
    dom = document.createElement(element.nodeType.nodeType)
  } else {
    dom = document.createElement(element.nodeType)
  }

  if (Array.isArray(element)) {
    element.forEach(el => {
      createWithProps(el, dom)
    })
  } else {
    createWithProps(element, dom)
  }

  container.appendChild(dom)
  return container
}

function createElement(nodeType, props, ...children) {
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

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function createWithProps(element, dom) {
  const isProperty = key => key !== 'children'

  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  element.props.children.forEach(child => {
    return renderEl(child, dom)
  })
}

export { createElement, renderEl }

