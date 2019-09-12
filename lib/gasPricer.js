const https = require("https")
const web3 = require("web3")

class EGSGasPricer {
    constructor() {
        this.apiUrl = "https://ethgasstation.info/json/ethgasAPI.json"
    }

    async getGasPrice() {
        const res = await httpsGet(this.apiUrl)
        // The ethgasstation returns gas prices as x10 gwei
        let price = web3.utils.toBN(
            web3.utils.toWei((JSON.parse(res).fast / 10).toString(), "gwei")
        ) 
        // Multiply by 1.15 to bump the price a bit
        return price.mul(web3.utils.toBN(115)).div(web3.utils.toBN(100)).toString()
    }
}

const httpsGet = url => {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Status Code: ${res.statusCode}`))
            }

            const data = []

            res.on("data", chunk => {
                data.push(chunk)
            })

            res.on("end", () => resolve(Buffer.concat(data).toString()))
        })
    })
}

module.exports = {
    EGSGasPricer
}