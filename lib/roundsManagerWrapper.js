const RoundsManagerArtifact = require("../artifacts/RoundsManager.json")

class RoundsManagerWrapper {
    constructor(web3Wrapper, roundsManagerAddress, account) {
        this.web3Wrapper = web3Wrapper
        this.roundsManagerAddress = roundsManagerAddress
        this.account = account
    }

    async currentRoundInitialized() {
        const roundsManager = await this.getRoundsManager()
        return await roundsManager.currentRoundInitialized()
    }

    async initializeRound() {
        const roundsManager = await this.getRoundsManager()
        const gas = await roundsManager.initializeRound.estimateGasAsync()
        const txHash = await roundsManager.initializeRound({from: this.account, gas: gas})
        const receipt = await this.web3Wrapper.waitForMinedTx(txHash)
        return receipt
    }

    async getRoundsManager() {
        if (this.instance !== undefined) {
            return this.instance
        }

        this.instance = await this.web3Wrapper.getContractInstance(RoundsManagerArtifact, this.roundsManagerAddress)

        return this.instance
    }
}

module.exports = RoundsManagerWrapper