const Web3 = require("web3")
const RoundsManagerABI = require("../artifacts/RoundsManager.json").abi

const ROUNDS_MANAGER_ADDRESSES = {
    1: "0x3984fc4ceeef1739135476f625d36d6c35c40dc3",
    4: "0x572d1591bD41f50130FD0212058eAe34F1B17290"
}

module.exports = class RoundInitializer {
    constructor(
        provider,
        blockWatcher,
        txSigner,
        gasPricer
    ) {
        this.provider = new Web3(provider)
        this.blockWatcher = blockWatcher
        this.txSigner = txSigner
        this.gasPricer = gasPricer 
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
        const netId = await this.provider.eth.net.getId()
        const gasPrice = await this.gasPricer.getGasPrice()
        const nonce = await this.provider.eth.getTransactionCount(caller)

        const signedTx = this.txSigner.signTransaction({
            nonce: nonce,
            gasPrice: gasPrice,
            gasLimit: gas,
            to: this.roundsManager.options.address,
            value: 0,
            data: data,
            chainId: netId
        })

        const receipt = await this.provider.eth.sendSignedTransaction(signedTx).on("transactionHash", txHash => {
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
            const netVersion = await this.provider.eth.net.getId()
            this.roundsManager = new this.provider.eth.Contract(RoundsManagerABI, ROUNDS_MANAGER_ADDRESSES[netVersion])
        }

        return this.roundsManager
    }
}