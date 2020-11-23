window.createStore = (function () {
  const createStore = (reducer) => {
    if (reducer === undefined || typeof reducer !== 'function') {
      return new Error('You can not use the store without a reducer')
    }
    let listeners = []
    let currentState = reducer(undefined, {})

    return {
      getState: () => currentState,
      dispatch: (action) => {
        currentState = reducer(currentState, action)

        listeners.forEach((listener) => {
          listener()
        })
      },
      subscribe: (newListener) => {
        listeners.push(newListener)

        const unsubscribe = () => {
          listeners = listeners.filter((l) => l !== newListener)
        }

        return unsubscribe
      }
    }
  }

  return createStore
}())
