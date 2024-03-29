const prompt = require("prompt-sync")();
const ethers = require("ethers");
const BlockWatcher = require("./lib/blockWatcher");
const RoundInitializer = require("./lib/roundInitializer");
const TxSigner = require("./lib/txSigner");
const SimpleBlockWatcher = require("./lib/simpleBlockWatcher");

const ROUNDS_MANAGER_ADDRESSES = {
  1: ["0x3984fc4ceeef1739135476f625d36d6c35c40dc3"],
  4: [
    // Testnet
    // "0x6c2A6B5cFDB30DAC34BD54af06611267e66fB07F",
    // Devnet,
    "0x55cfb784ca12744275d9742B843486225C695e64",
  ],
  421611: [
    // Devnet
    "0xa3Aa52cE79e85a21d9cCdA705C57e426B160112c",
    // Testnet
    "0x3BEc08BA9D8A5b44F5C5E38F654b3efE73555d58",
  ],
  42161: ["0xdd6f56DcC28D3F5f27084381fE8Df634985cc39f"],
};

const argv = require("yargs")
  .usage(
    "Usage: $0 --rinkeby --provider [provider URL] --account [Ethereum account] --password [Ethereum account password] --datadir [data directory] --roundsManagerAddr [RoundsManager addresses] --pollingInterval [block polling interval in ms] --noBlockstream"
  )
  .boolean(["rinkeby", "noBlockstream"])
  .string(["provider", "account", "roundsManagerAddr", "password"])
  .default("roundsManagerAddr", "")
  .demandOption(["account", "datadir"])
  .env("LP_").argv;

const run = async () => {
  let providerUrl;
  if (argv.provider) {
    providerUrl = argv.provider;
  } else {
    if (argv.rinkeby) {
      providerUrl = "https://rinkeby.infura.io";
    } else {
      providerUrl = "https://mainnet.infura.io";
    }
  }

  const provider = new ethers.providers.JsonRpcProvider(providerUrl);

  const password =
    argv.password || prompt(`Password for ${argv.account}: `, { echo: "" });

  const txSigner = new TxSigner(provider, argv.datadir, argv.account);
  txSigner.unlock(password);
  console.log(`Unlocked account ${argv.account}`);

  let roundsManagerAddrs = argv.roundsManagerAddr.split(",");
  if (roundsManagerAddrs.length == 0 || roundsManagerAddrs[0] === "") {
    const network = await provider.getNetwork();
    roundsManagerAddrs = ROUNDS_MANAGER_ADDRESSES[network.chainId];
  }

  const blockWatcher = argv.noBlockstream
    ? new SimpleBlockWatcher(provider, argv.pollingInterval)
    : new BlockWatcher(provider, argv.pollingInterval);
  const roundInitializer = new RoundInitializer(
    provider,
    roundsManagerAddrs,
    blockWatcher,
    txSigner
  );

  await roundInitializer.start();

  process.on("SIGINT", async () => {
    await roundInitializer.stop();
    txSigner.clear();

    console.log("Stopping round initializer...");
    process.exit(0);
  });
};

try {
  run();
} catch (err) {
  console.error(err);
}
