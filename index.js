const Web3 = require("web3")
const prompt = require("prompt-sync")()
const BlockWatcher = require("./lib/blockWatcher")
const RoundInitializer = require("./lib/roundInitializer")
const TxSigner = require("./lib/txSigner")
const { Web3GasPricer, EGSGasPricer } = require("./lib/gasPricer")

const argv = require("yargs")
    .usage("Usage: $0 --rinkeby --provider [provider URL] --account [Ethereum account] --datadir [data directory]")
    .boolean(["rinkeby"])
    .string(["provider", "account"])
    .demandOption(["account", "datadir"])
    .argv

const run = async () => {
    const password = prompt(`Password for ${argv.account}: `, { echo: "" })
    const txSigner = new TxSigner(argv.datadir, argv.account)
    txSigner.unlock(password)
    console.log(`Unlocked account ${argv.account}`)

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

    const provider = new Web3.providers.HttpProvider(providerUrl)

    let gasPricer
    if (argv.rinkeby) {
        gasPricer = new Web3GasPricer()
    } else {
        gasPricer = new EGSGasPricer()
    }

    const blockWatcher = new BlockWatcher(provider)
    const roundInitializer = new RoundInitializer(provider, blockWatcher, txSigner, gasPricer)

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