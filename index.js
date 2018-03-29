const path = require("path")
const Web3Wrapper = require("./lib/web3Wrapper")
const ControllerWrapper = require("./lib/controllerWrapper")
const RoundsManagerWrapper = require("./lib/roundsManagerWrapper")
const Web3 = require("web3")
const prompt = require("prompt-sync")()
const sleep = require('system-sleep');

const yargsOpts = {
    alias: {
        "controller": ["c"],
        "account": ["a"],
        "password": ["p"]
    },
    configuration: {
        "parse-numbers": false
    }
}
const argv = require("yargs-parser")(process.argv.slice(2), yargsOpts)
const provider = new Web3.providers.HttpProvider("http://localhost:8545")

const run = async () => {
    if (argv.controller === undefined) {
        abort("Must pass in the Controller contract address")
    }

    if (argv.account === undefined) {
        abort("Must pass in a valid Ethereum account address")
    }

    const web3Wrapper = new Web3Wrapper(provider)
    const nodeType = await web3Wrapper.getNodeType()

    if (!nodeType.match(/TestRPC/i)) {
        // Not connected to TestRPC
        // User must unlock account

        const success = unlock(argv.account, argv.password, web3Wrapper)
        if (!success) {
            abort("Failed to unlock account")
        }
    }

    console.log(`Account ${argv.account} unlocked`)

    const controller = new ControllerWrapper(web3Wrapper, argv.controller)
    const roundsManagerAddr = await controller.getRoundsManagerAddress()
    const roundsManager = new RoundsManagerWrapper(web3Wrapper, roundsManagerAddr, argv.account)
    console.log("RoundsManager Address: ", roundsManagerAddr)

    let roundInitialized 
    while (true) {
        try {
            roundInitialized = await roundsManager.currentRoundInitialized()
            console.log('Rounds Initialized: ', roundInitialized);

            if (!roundInitialized) {
                let r = await roundsManager.initializeRound()
                console.log("initialize round: ", r)
            }
        } catch (error) {
            console.log("Error: ", error)
        }
        sleep(2000)
    }
}

const unlock = async (account, password, web3Wrapper) => {
    let success = await web3Wrapper.unlockAccount(account, password)
    if (!success) {
        // Prompt for password if default password fails
        password = prompt("Password: ")

        return await web3Wrapper.unlockAccount(account, password)
    } else {
        return true
    }
}


run().catch(console.log)