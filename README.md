# Initialization Daemon

A Node.js application for monitoring the Livepeer protocol and
initializing rounds.

## Install

```sh
npm install
```

## Running

```sh
cd initialization-daemon
node index.js --provider "<PROVIDER_URL>" --account "<ACCOUNT_ADDRESS>" --datadir "<DATA_DIR>"
```

You will be prompted for a password to unlock the account.

### Options

- `--provider`: The ETH RPC provider
  URL. Ex. `https://arbitrum-mainnet.infura.io/v3/<API_SECRET>`
- `--account`: The ETH address that will submit round initialization
  transactions. The keystore file for the account needs to be in the
  directory specified by `--datadir`.
	- The [library][library] used for importing keys from keystore
      files requires the keystore file name to contain the account
      address. For example, if the address is `0xfoo`, the keystore
      file name must contain `foo` (0x prefix stripped). If the
      keystore file name is `blahblah-foo` then it must be accessible
      at `<DATA_DIR>/keystore/blahblah-foo` The keystore files
      generated by `geth` have file names such as
      `UTC--2018-08-06T18-32-59.279635944Z--foo`.
- `--datadir`: The directory that contains a `keystore` sub-directory
  that contains the keystore file for the address specified by
  `--account`.

## Architecture

The high level architecture of the application consists of the following:

- The user unlocks an account by entering a password.
- The application polls for new blocks using the ETH RPC provider URL.
- The application fetches [the address of the RoundsManager protocol
  contract][1] based on the chain ID of the network that the ETH RPC
  provider URL is connected to which should correspond to the
  RoundsManager proxy contract address specified in the [docs][docs].
- For each new block, the application checks the RoundsManager to see
  if the current round is initialized.
- If the current round is not initialized, the application uses the
  private key for the unlocked account to submit a round
  initialization transaction.

---

  [1]: https://github.com/livepeer/initialization-daemon/blob/d949b1fa595cc7d09f9c0e66c6e66885ea7be3e3/index.js#L7
  [docs]: https://docs.livepeer.org/reference/deployed-contract-addresses
  [library]: https://github.com/ethereumjs/keythereum#key-import
