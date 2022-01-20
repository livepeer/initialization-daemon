const RoundsManagerABI = require("../artifacts/RoundsManager.json").abi
const ethers = require("ethers")

module.exports = class RoundInitializer {
    constructor(
        provider,
        roundsManagerAddrs,
        blockWatcher,
        txSigner
    ) {
        this.provider = provider
        this.roundsManagerAddrs = roundsManagerAddrs
        this.blockWatcher = blockWatcher
        this.txSigner = txSigner
        this.roundsManager = null
        // RoundsManager address => tx hash
        this.pendingTxHash = {}
    }

    async start() {
        this.blockWatcher.subscribe(block => this.tryInitializeRounds(block.number))
    }

    async stop() {
        this.blockWatcher.unsubscribe()
    }

    async tryInitializeRounds(blockNumber) {
        for (const addr of this.roundsManagerAddrs) {
            await this.tryInitializeRound(addr, blockNumber)
        }
    }

    async tryInitializeRound(roundsManagerAddr, blockNumber) {
        const roundsManager = await this.getRoundsManager(roundsManagerAddr)

        const initialized = await roundsManager.currentRoundInitialized()

        if (!initialized) {
            console.log(`${roundsManagerAddr}: Round is not initialized during block ${blockNumber}`)

            if (this.getPendingTxHash(roundsManagerAddr)) {
                console.log(`${roundsManagerAddr}: Round initialization pending with tx ${this.getPendingTxHash(roundsManagerAddr)}`)
            } else {
                try {
                    await this.initializeRound(roundsManager)
                    
                    const currRound = await roundsManager.currentRound()
                    console.log(`${roundsManagerAddr}: Round ${currRound} initialized`)
                } catch (err) {
                    console.log(`${roundsManagerAddr}: Error initializing round: ${err}`)
                }
            }
       } else {
            console.log(`${roundsManagerAddr}: Round already initialized during block ${blockNumber}`)
       }
    }

    async initializeRound(roundsManager) {
        const res = await roundsManager.initializeRound()

        this.setPendingTxHash(roundsManager.address, res.hash)

        const receipt = await res.wait()

        this.deletePendingTxHash(roundsManager.address)

        if (!receipt.status) {
            throw new Error(`Failed to initialize round`)
        }
    }

    async getRoundsManager(roundsManagerAddr) {
        return new ethers.Contract(roundsManagerAddr, RoundsManagerABI, this.txSigner.signer)
    }

    setPendingTxHash(roundsManagerAddr, hash) {
        this.pendingTxHash[roundsManagerAddr.toLowerCase()] = hash
    }

    deletePendingTxHash(roundsManagerAddr) {
        delete this.pendingTxHash[roundsManagerAddr.toLowerCase()]
    }

    getPendingTxHash(roundsManagerAddr) {
        return this.pendingTxHash[roundsManagerAddr.toLowerCase()]
    }
}