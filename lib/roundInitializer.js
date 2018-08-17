const Web3 = require("web3")
const RoundsManagerABI = require("../artifacts/RoundsManager.json").abi

const ROUNDS_MANAGER_ADDRESSES = {
    1: "0x3984fc4ceeef1739135476f625d36d6c35c40dc3",
    4: "0xEB0EF46B5771D523402234FF0d7596d2C62411dE"
}

module.exports = class RoundInitializer {
    constructor(
        provider,
        blockWatcher,
        txSigner
    ) {
        this.web3 = new Web3(provider)
        this.blockWatcher = blockWatcher
        this.txSigner = txSigner
        this.roundsManager = null
        this.pendingTxHash = null
    }

    async start() {
        this.blockWatcher.subscribe(block => this.tryInitializeRound(block.number))
    }

    async stop() {
        this.blockWatcher.unsubscribe()
    }

    async tryInitializeRound(blockNumber) {
        const roundsManager = await this.getRoundsManager()

        const initialized = await roundsManager.methods.currentRoundInitialized().call()

        if (!initialized) {
            console.log(`Round is not initialized during block ${blockNumber}`)

            if (this.pendingTxHash !== null) {
                console.log(`Round initialization pending with tx ${this.pendingTxHash}`)
            } else {
                try {
                    await this.initializeRound()
                    
                    const currRound = await roundsManager.methods.currentRound().call()
                    console.log(`Round ${currRound} initialized`)
                } catch (err) {
                    console.log(`Error initializing round: ${err}`)
                }
            }
       } else {
            console.log(`Round already initialized during block ${blockNumber}`)
       }
    }

    async initializeRound() {
        const roundsManager = await this.getRoundsManager()
        const initializeFn = roundsManager.methods.initializeRound()
        const caller = this.txSigner.getAddress()
        const gas = await initializeFn.estimateGas({ from: caller })
        const data = initializeFn.encodeABI()
        const netId = await this.web3.eth.net.getId()
        const gasPrice = await this.web3.eth.getGasPrice()
        const nonce = await this.web3.eth.getTransactionCount(caller, "pending")

        const signedTx = this.txSigner.signTransaction({
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gas,
            to: this.roundsManager.options.address,
            value: 0,
            data: data,
            chainId: netId
        })

        const receipt = await this.web3.eth.sendSignedTransaction(signedTx).on("transactionHash", txHash => {
            this.pendingTxHash = txHash
            console.log(`Submitted tx ${txHash} to initialize round`)
        })

        this.pendingTxHash = null

        if (receipt.status === "0x0") {
            throw new Error(`Failed to initialize round`)
        }
    }

    async getRoundsManager() {
        if (this.roundsManager === null) {
            const netVersion = await this.web3.eth.net.getId()
            this.roundsManager = new this.web3.eth.Contract(RoundsManagerABI, ROUNDS_MANAGER_ADDRESSES[netVersion])
        }

        return this.roundsManager
    }
}