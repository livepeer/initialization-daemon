const Web3 = require("web3")
const keythereum = require("keythereum")
const EthTx = require("ethereumjs-tx")

module.exports = class TxSigner {
    constructor(
        dataDir,
        address
    ) {
        this.dataDir = dataDir
        this.address = address
    }

    getAddress() {
        return this.address
    }

    unlock(password) {
        const keyObj = keythereum.importFromFile(this.address.toLowerCase(), this.dataDir)
        this.privKey = keythereum.recover(password, keyObj)
    }

    clear() {
        this.privKey = null
    }

    signTransaction(txObj) {
        const rawTx = {
            nonce: Web3.utils.toHex(txObj.nonce),
            gasPrice: Web3.utils.toHex(txObj.gasPrice),
            gasLimit: Web3.utils.toHex(txObj.gasLimit),
            to: txObj.to,
            value: Web3.utils.toHex(txObj.value),
            data: txObj.data,
            chainId: txObj.chainId
        }

        const tx = new EthTx(rawTx)

        tx.sign(this.privKey)

        return "0x" + tx.serialize().toString("hex")
    }
}