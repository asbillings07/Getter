import { setItem, getItem } from './helperFunctions'


export class Options {
    async constructor (options) {
        this.options = options
        await setItem(options)
    }

    async setLocalOption = (item) => {
        await setItem(item)
    }

    async getLocalOption = (item) => {
        const option = await getItem(item)
        return option
    }

    getOption = (option) => {
        return this.options[option]
    }

    async setOption = (option, value) => {
        this.options[option] = value
        await setItem({ cssOptions: this.options })
    }

    async setAllOptions = (options) => {
        this.options = options
        await setItem({ cssOptions: this.options })
    }

    // hasOptionChanged = () => {
    //     chrome.storage.onChanged.addListener(async (changes) => {
    //         // console.log(changes)
    //         if ('cssOptions' in changes && changes.cssGetters.newValue) {
    //           cssValues = await getItem('cssGetters')
    //         }
    //     })
    // }


}