# Initialization Daemon

A Node.js application for monitoring the Livepeer protocol and initializing rounds.

## Requirements

- Node version >= 8.5.0
- A local running Ethereum node with an unlocked account

## Running

```
cd initialization-daemon
node index.js -a <ACCOUNT_ADDRESS> -c <CONTROLLER_ADDRESS>
```