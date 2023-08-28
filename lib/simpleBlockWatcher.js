const DEFAULT_POLLING_INTERVAL_MS = 13000

/**
 * Block watcher that just fetches the last block and triggers the callback if it changed. This is opposed to the
 * blockstream implementation that fetches all blocks since the previous one. This is needed for some testnet providers
 * that throttle their API response times, making the default blockstreamer not keep up with all blocks produced.
 */
module.exports = class SimpleBlockWatcher {
    constructor(
        provider,
        pollingInterval
    ) {
        this.provider = provider
        this.pollingInterval = pollingInterval || DEFAULT_POLLING_INTERVAL_MS

        this.lastBlockNumber = undefined
        this.intervalId = undefined
    }

    subscribe(cb) {
        this.intervalId = this.setIntervalAsyncFn(async () => {
            const latestBlock = await this.provider.getBlock("latest")

            if (!this.lastBlockNumber || latestBlock.number > this.lastBlockNumber) {
                this.lastBlockNumber = latestBlock.number

                await cb(latestBlock)
            }
        }, this.pollingInterval, this.onError.bind(this))
    }

    unsubscribe() {
        this.clearIntervalAsyncFn(this.intervalId)
    }

    onError(err) {
        console.warn("Block watcher error:", err)
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
