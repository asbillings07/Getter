export default (function () {
  const ERROR = 'ERROR'
  const GETSTYLES = 'GETSTYLES'
  const LOADING = 'LOADING'
  const TOGGLESUCCESS = 'TOGGLESUCCESS'

  const initialState = {
    styles: {},
    success: false,
    error: false,
    errorMessage: null,
    loading: true
  }

  const stateReducer = (state, action) => {
    switch (action.type) {
      case GETSTYLES:
        return {
          ...state,
          styles: action.payload.styles,
          loading: false
        }
      case LOADING:
        return {
          ...state,
          loading: true
        }
      case TOGGLESUCCESS:
        return {
          ...state,
          success: action.payload
        }
      case ERROR:
        return {
          ...state,
          error: true,
          errorMessage: action.payload.error,
          loading: false
        }
      default:
        return state
    }
  }
  return { initialState, stateReducer }
})()