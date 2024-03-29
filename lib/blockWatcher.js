const { BlockAndLogStreamer } = require("ethereumjs-blockstream")

const DEFAULT_POLLING_INTERVAL_MS = 13000

module.exports = class BlockWatcher {
    constructor(
        provider,
        pollingInterval
    ) {
        this.provider = provider
        this.pollingInterval = pollingInterval || DEFAULT_POLLING_INTERVAL_MS
        this.blockAndLogStreamer = undefined
        this.onBlockAddedSubscriptionToken = undefined
        this.blockAndLogStreamerIntervalId = undefined
    }

    subscribe(cb) {
        this.startBlockAndLogStream(cb)
    }

    unsubscribe() {
        this.stopBlockAndLogStream()
    }

    startBlockAndLogStream(cb) {
        this.blockAndLogStreamer = new BlockAndLogStreamer(
            this.getBlockByHash.bind(this),
            this.getLogs.bind(this),
            this.onBlockAndLogStreamerError.bind(this),
            { blockRetention: 100 }
        )

        this.blockAndLogStreamerIntervalId = this.setIntervalAsyncFn(
            this.reconcileBlock.bind(this),
            this.pollingInterval,
            this.onBlockAndLogStreamerError.bind(this)
        )
        this.onBlockAddedSubscriptionToken = this.blockAndLogStreamer.subscribeToOnBlockAdded(block => cb(block))
    }

    stopBlockAndLogStream() {
        this.blockAndLogStreamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
        delete this.blockAndLogStreamer
    }

    async reconcileBlock() {
        const latestBlock = await this.getLatestBlock()
        await this.blockAndLogStreamer.reconcileNewBlock(latestBlock)
    }

    // Blockstream functions

    async getBlockByHash(hash) {
        return this.provider.getBlock(hash)
    }

    async getLogs(filterOpts) {
        return this.provider.getLogs(filterOpts)
    }

    async getLatestBlock() {
        return this.provider.getBlock("latest")
    }

    onBlockAndLogStreamerError(err) {
        console.warn(err)
    }
    
    // Utilities

    setIntervalAsyncFn(fn, intervalMs, onError) {
        let isRunning = false
        const intervalId = setInterval(async () => {
            if (isRunning) {
                return
            } else {
                isRunning = true
                try {
                    await fn()
                } catch (err) {
                    onError(err)
                }
                isRunning = false
            }
        }, intervalMs)

        return intervalId
    }

    clearIntervalAsyncFn(intervalId) {
        clearInterval(intervalId)
    }
}