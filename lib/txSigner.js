const keythereum = require("keythereum")
const ethers = require("ethers")

module.exports = class TxSigner {
    constructor(
        provider,
        dataDir,
        address
    ) {
        this.provider = provider
        this.dataDir = dataDir
        this.address = address
    }

    getAddress() {
        return this.address
    }

    unlock(password) {
        const keyObj = keythereum.importFromFile(this.address.toLowerCase(), this.dataDir)
        const privKey = keythereum.recover(Buffer.from(password), keyObj)
        this.signer = new ethers.Wallet(privKey, this.provider)
    }

    clear() {
        this.signer = null
    }
}