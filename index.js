const Web3Wrapper = require("./lib/web3Wrapper")
const ControllerWrapper = require("./lib/controllerWrapper")
const RoundsManagerWrapper = require("./lib/roundsManagerWrapper")
const Web3 = require("web3")
const prompt = require("prompt-sync")()

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

        try {
            await unlock(argv.account, argv.password, web3Wrapper)
        } catch (err) {
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

        await new Promise(resolve => {
            setTimeout(resolve, 2000)
        })
    }
}

const abort = msg => {
    console.log(msg || "Error occured")
    process.exit(1)
}

const unlock = async (account, password, web3Wrapper) => {
    try {
        await web3Wrapper.unlockAccount(account, password)
    } catch (err) {
        // Prompt for password if default password fails
        password = prompt("Password: ", {echo: ""})

        await web3Wrapper.unlockAccount(account, password)
    }
}


run().catch(console.log)
