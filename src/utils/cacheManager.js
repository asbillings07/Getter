import { setItem, isCacheEmpty } from './helperFunctions'

export class CacheManager {

    constructor (initialState) {

        if (CacheManager._instance) {
            return CacheManager._instance
        }

        setItem(initialState)
        this.state = initialState
        CacheManager._instance = this
    }

    getAllState = () => {
        return this.state
    }

    getState = (name) => {
        return this.state[name]
    }

    setState = (name, data) => {
        this.state = { ...this.state, [name]: data }
        console.log(this.state[name])
        return this.state
    }

    save = () => {
        setItem(this.state)
    }

}