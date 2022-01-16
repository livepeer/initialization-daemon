const prompt = require("prompt-sync")()
const ethers = require("ethers")
const BlockWatcher = require("./lib/blockWatcher")
const RoundInitializer = require("./lib/roundInitializer")
const TxSigner = require("./lib/txSigner")

const ROUNDS_MANAGER_ADDRESSES = {
    1: "0x3984fc4ceeef1739135476f625d36d6c35c40dc3",
    4: "0x6c2A6B5cFDB30DAC34BD54af06611267e66fB07F"
}

const argv = require("yargs")
    .usage("Usage: $0 --rinkeby --provider [provider URL] --account [Ethereum account] --datadir [data directory] --roundsManagerAddr [RoundsManager address]")
    .boolean(["rinkeby"])
    .string(["provider", "account", "roundsManagerAddr"])
    .demandOption(["account", "datadir"])
    .argv

const run = async () => {
    let providerUrl
    if (argv.provider) {
        providerUrl = argv.provider
    } else {
        if (argv.rinkeby) {
            providerUrl = "https://rinkeby.infura.io"
        } else {
            providerUrl = "https://mainnet.infura.io"
        }
    }

    const provider = new ethers.providers.JsonRpcProvider(providerUrl)

    const password = prompt(`Password for ${argv.account}: `, { echo: "" })

    const txSigner = new TxSigner(provider, argv.datadir, argv.account)
    txSigner.unlock(password)
    console.log(`Unlocked account ${argv.account}`)

    let roundsManagerAddr = argv.roundsManagerAddr
    if (!roundsManagerAddr) {
        const network = await provider.getNetwork()
        roundsManagerAddr = ROUNDS_MANAGER_ADDRESSES[network.chainId]
    }

    const blockWatcher = new BlockWatcher(provider)
    const roundInitializer = new RoundInitializer(provider, roundsManagerAddr, blockWatcher, txSigner)

    await roundInitializer.start()

    process.on("SIGINT", async () => {
        await roundInitializer.stop()
        txSigner.clear()

        console.log("Stopping round initializer...")
        process.exit(0)
    })
}

try {
    run()
} catch (err) {
    console.error(err)
}