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
        // RoundsManager address => initialization pending?
        this.isPending = {}
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
        if (this.isPending[roundsManagerAddr]) {
            return
        }

        this.isPending[roundsManagerAddr] = true

        const roundsManager = await this.getRoundsManager(roundsManagerAddr)

        const initialized = await roundsManager.currentRoundInitialized()
        
        if (initialized) {
            console.log(`${roundsManagerAddr}: Round already initialized during block ${blockNumber}`)
            return
        }

        console.log(`${roundsManagerAddr}: Round is not initialized during block ${blockNumber}`)

        const currRound = await roundsManager.currentRound()

        try {
            const res = await roundsManager.initializeRound()
            await res.wait()
                    
            console.log(`${roundsManagerAddr}: Round ${currRound} initialized in tx ${res.hash}`)
        } catch (err) {
            console.log(`${roundsManagerAddr}: Error initializing round ${currRound}: ${err}`)
        }

        this.isPending[roundsManagerAddr] = false
    }

    async getRoundsManager(roundsManagerAddr) {
        return new ethers.Contract(roundsManagerAddr, RoundsManagerABI, this.txSigner.signer)
    }
}