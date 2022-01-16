const RoundsManagerABI = require("../artifacts/RoundsManager.json").abi
const ethers = require("ethers")

module.exports = class RoundInitializer {
    constructor(
        provider,
        roundsManagerAddr,
        blockWatcher,
        txSigner
    ) {
        this.provider = provider
        this.roundsManagerAddr = roundsManagerAddr
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

        const initialized = await roundsManager.currentRoundInitialized()

        if (!initialized) {
            console.log(`Round is not initialized during block ${blockNumber}`)

            if (this.pendingTxHash !== null) {
                console.log(`Round initialization pending with tx ${this.pendingTxHash}`)
            } else {
                try {
                    await this.initializeRound()
                    
                    const currRound = await roundsManager.currentRound()
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

        const res = await roundsManager.initializeRound()

        this.pendingTxHash = res.hash

        const receipt = await res.wait()

        this.pendingTxHash = null

        if (!receipt.status) {
            throw new Error(`Failed to initialize round`)
        }
    }

    async getRoundsManager() {
        if (this.roundsManager === null) {
            this.roundsManager = new ethers.Contract(this.roundsManagerAddr, RoundsManagerABI, this.txSigner.signer)
        }

        return this.roundsManager
    }
}