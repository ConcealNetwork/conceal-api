# CJSI - Conceal Javascript Interface RPC/API
Javascript/Node.js interface to Conceal cryptocurrency RPC/API.

There are three RPC servers built in to the three programs *conceald*, *concealwallet* and *walletd*.
They can each be started with the argument `--help` to display command line options.

### conceald
A node on the P2P network (daemon) with no wallet functions; console interactive. To launch:
```
$ ./conceald
```
The default daemon RPC port is 16000 and the default P2P port is 15000.
### walletd
A node on the P2P network (daemon) with wallet functions; console non-interactive. To launch, assuming that your `my.wallet` file is in the current directory:
```
$ ./walletd --container-file my.wallet --container-password PASSWD --local --bind-port 3333
```
The wallet functions RPC port is 3333. The default daemon P2P port is 15000. The default daemon RPC port is 16000. The `--local` option activates the daemon; otherwise, a remote daemon can be used.
### concealwallet
A simple wallet; console interactive unless RPC server is running; requires access to a node daemon for full functionality. To launch, assuming that your `my.wallet` file is in the current directory:
```
$ ./concealwallet --rpc-bind-port 3333 --wallet-file my --password PASSWORD
```
The wallet functions RPC port is 3333. By default the wallet connects with the daemon on port 16000. It is possible to run several instances simultaneously using different wallets and ports.
## Quick start for node.js
```
$ npm install conceal-js
$ ./conceald # launch the network daemon
$ ./concealwallet --rpc-bind-port PORT --wallet-file my --password PASSWORD # launch the simple wallet
```
Create and run a test program.
```
$ node test.js
```
The test program could contain, for example, a payment via the simple wallet's RPC server
```
const CCX = require('conceal-js')
const ccx = new CCX('http://localhost', '3333')

ccx.send([{
  address: 'ccx7Xd3NBbBiQNvv7vMLXmGMHyS8AVB6EhWoHo5EbGfR2Ki9pQnRTfEBt3YxYEVqpUCyJgvPjBYHp8N2yZwA7dqb4PjaGWuvs4',
  amount: 1234567
}])
.then((res) => { console.log(res) }) // display tx hash upon success
.catch((err) => { console.log(err) }) // display error message upon failure
```
## API
```
const CCX = require('conceal-js')
const ccx = new CCX(host, walletRpcPort, daemonRpcPort)
```
ccx.rpc returns a promise, where *rpc* is any of the methods below:

* [Wallet RPC (must provide walletRpcPort)](#wallet)
  * concealwallet
    * [Get height](#height)
    * [Get balance](#balance)
    * [Get messages](#messages)
    * [Get incoming payments](#payments)
    * [Get transfers](#transfers)
    * [Get number of unlocked outputs](#outputs)
    * [Reset wallet](#reset)
    * [Store wallet](#store)
    * [Optimize wallet](#optimize)
    * [Send transfers](#send)
  * walletd
    * [Reset or replace wallet](#resetOrReplace)
    * [Get status](#status)
    * [Get balance](#getBalance)
    * [Create address](#createAddress)
    * [Delete address](#deleteAddress)
    * [Get addresses](#getAddresses)
    * [Get view secret Key](#getViewSecretKey)
    * [Get spend keys](#getSpendKeys)
    * [Get block hashes](#getBlockHashes)
    * [Get transaction](#getTransaction)
    * [Get unconfirmed transactions](#getUnconfirmedTransactions)
    * [Get transaction hashes](#getTransactionHashes)
    * [Get transactions](#getTransactions)
    * [Send transaction](#sendTransaction)
    * [Create delayed transaction](#createDelayedTransaction)
    * [Get delayed transaction hashes](#getDelayedTransactionHashes)
    * [Delete delayed transaction](#deleteDelayedTransaction)
    * [Send delayed transaction](#sendDelayedTransaction)
    * [Get incoming messages from transaction extra field](#getMessagesFromExtra)
* [Daemon RPC (must provide daemonRpcPort)](#daemon)
  * [Get info](#info)
  * [Get index](#index)
  * [Get count](#count)
  * [Get currency ID](#currencyId)
  * [Get block hash by height](#blockHashByHeight)
  * [Get block header by height](#blockHeaderByHeight)
  * [Get block header by hash](#blockHeaderByHash)
  * [Get last block header](#lastBlockHeader)
  * [Get block](#block)
  * [Get blocks](#blocks)
  * [Get block template](#blockTemplate)
  * [Submit block](#submitBlock)
  * [Get transaction](#transaction)
  * [Get transactions](#transactions)
  * [Get transaction pool](#transactionPool)
  * [Send raw transaction](#sendRawTransaction)

### <a name="wallet"></a>Wallet RPC (must provide walletRpcPort)

#### <a name="height"></a>Get height (concealwallet)
```
ccx.height() // get last block height
```
#### <a name="balance">Get balance (concealwallet)
```
ccx.balance() // get wallet balances
```
#### <a name="messages">Get messages (concealwallet)
```
const opts = {
  firstTxId: FIRST_TX_ID, // (integer, optional), ex: 10
  txLimit: TX_LIMIT // maximum number of messages (integer, optional), ex: 10
}
ccx.messages(opts) // opts can be omitted
```
#### <a name="payments">Get incoming payments (concealwallet)
```
const paymentId = PAYMENT_ID // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.payments(paymentId)
```
#### <a name="transfers">Get transfers (concealwallet)
```
ccx.transfers() // gets all transfers
```
#### <a name="outputs">Get number of unlocked outputs (concealwallet)
```
ccx.outputs() // gets outputs available as inputs for a new transaction
```
#### <a name="reset">Reset wallet (concealwallet)
```
ccx.reset() // discard wallet cache and resync with block chain
```
#### <a name="store">Store wallet (concealwallet)
```
ccx.store() // save wallet cache to disk
```
#### <a name="optimize">Optimize wallet (concealwallet)
```
ccx.optimize() // combines many available outputs into a few by sending to self
```
#### <a name="send">Send transfers (concealwallet)
```
const transfers = [{ address: ADDRESS, amount: AMOUNT, message: MESSAGE }, ...] // ADDRESS = destination address (string, required), AMOUNT = raw CCX (integer, required), MESSAGE = transfer message to be encrypted (string, optional)
const opts = {
  transfers: transfers, // (array, required), ex: [{ address: 'ccx7Xd...', amount: 1000, message: 'refund' }]
  fee: FEE, // (raw CCX integer, optional, default is minimum required), ex: 10
  anonimity: MIX_IN, // input mix count (integer, optional, default 2), ex: 6
  paymentId: PAYMENT_ID, // (64-digit hex string, optional), ex: '0ab1...3f4b'
  unlockHeight: UNLOCK_HEIGHT // block height to unlock payment (integer, optional), ex: 12750
}
ccx.send(opts)
```
#### <a name="resetOrReplace">Reset or replace wallet (walletd)
```
const viewSecretKey = VIEW_SECRET_KEY // (64-digit hex string, optional), ex: '0ab1...3f4b'
ccx.resetOrReplace(viewSecretKey) // If no key, wallet is re-synced. If key, a new address is created from the key for a new wallet.
```
#### <a name="status">Get status (walletd)
```
ccx.status()
```
#### <a name="getBalance">Get balance (walletd)
```
const address = ADDRESS // (string, required), ex: 'ccx7Xd...'
ccx.getBalance(address)
```
#### <a name="createAddress">Create address (walletd)
```
ccx.createAddress()
```
#### <a name="deleteAddress">Delete address (walletd)
```
const address = ADDRESS // (string, required), ex: 'ccx7Xd...'
ccx.deleteAddress(address)
```
#### <a name="getAddresses">Get addresses (walletd)
```
ccx.getAddresses()
```
#### <a name="getViewSecretKey">Get view secret key (walletd)
```
ccx.getViewSecretKey()
```
#### <a name="getSpendKeys">Get spend keys (walletd)
```
const address = ADDRESS // (string, required), ex: 'ccx7Xd...'
ccx.getSpendKeys(address)
```
#### <a name="getBlockHashes">Get block hashes (walletd)
```
const firstBlockIndex = FIRST_BLOCK_INDEX // index of first block (integer, required), ex: 12750
const blockCount = BLOCK_COUNT // number of blocks to include (integer, required), ex: 30
ccx.getBlockHashes(firstBlockIndex, blockCount)
```
#### <a name="getTransaction">Get transaction (walletd)
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.getTransaction(hash) // get transaction details given hash
```
#### <a name="getUnconfirmedTransactions">Get unconfirmed transactions (walletd)
```
const addresses = [ADDRESS1, ADDRESS2, ...] // ADDRESS = address string; address to include
ccx.getUnconfirmedTransactions(addresses) // addresses can be omitted
```
#### <a name="getTransactionHashes">Get transactionHashes (walletd)
```
const opts = { // either blockHash or firstBlockIndex is required
  blockHash: BLOCK_HASH, // hash of first block (64-digit hex string, see comment above), ex: '0ab1...3f4b'
  firstBlockIndex: FIRST_BLOCK_INDEX, // index of first block (integer, see comment above), ex: 12750
  blockCount: BLOCK_COUNT, // number of blocks to include (integer, required), ex: 30
  addresses: [ADDRESS, ...], filter (array of address strings, optional), ex: ['ccx7Xd...']
  paymentId: PAYMENT_ID // filter (64-digit hex string, optional), ex: '0ab1...3f4b'
}
ccx.getTransactionHashes(opts)
```
#### <a name="getTransactions">Get transactions (walletd)
```
const opts = { // either blockHash or firstBlockIndex is required
  blockHash: BLOCK_HASH, // hash of first block (64-digit hex string, see comment above), ex: '0ab1...3f4b'
  firstBlockIndex: FIRST_BLOCK_INDEX, // index of first block (integer, see comment above), ex: 12750
  blockCount: BLOCK_COUNT, // number of blocks to include (integer, required), ex: 30
  addresses: [ADDRESS, ...], filter (array of address strings, optional), ex: ['ccx7Xd...']
  paymentId: PAYMENT_ID // filter (64-digit hex string, optional), ex: '0ab1...3f4b'
}
ccx.getTransactions(opts)
```
#### <a name="sendTransaction">Send transaction (walletd)
```
const transfers = [{ address: ADDRESS, amount: AMOUNT, message: MESSAGE }, ...] // ADDRESS = destination address (string, required), AMOUNT = raw CCX (integer, required), MESSAGE = transfer message to be encrypted (string, optional)
const addresses = [ADDRESS1, ADDRESS2, ...] // ADDRESS = source address string; address in wallet to take funds from
const opts = {
  transfers: transfers, // (array, required), ex: [{ address: 'ccx7Xd...', amount: 1000, message: 'tip' }]
  addresses: addresses, // (array, optional), ex: ['ccx7Xd...', 'ccx7Xe...']
  changeAddress: ADDRESS, // change return address (address string, optional if only one address in wallet or only one source address given), ex: 'ccx7Xd...'
  paymentId: PAYMENT_ID, // filter (64-digit hex string, optional), ex: '0ab1...3f4b'
  anonimity: MIX_IN, // input mix count (integer, optional, default 2), ex: 6
  fee: FEE, // (raw CCX integer, optional, default is minimum required), ex: 10
  unlockHeight: UNLOCK_HEIGHT, // block height to unlock payment (integer, optional), ex: 12750
  extra: EXTRA // (variable length string, optional), ex: '123abc'
}
ccx.sendTransaction(opts)
```
#### <a name="createDelayedTransaction">Create delayed transaction (walletd)
```
const transfers = [{ address: ADDRESS, amount: AMOUNT, message: MESSAGE }, ...] // ADDRESS = destination address (string, required), AMOUNT = raw CCX (integer, required), MESSAGE = transfer message to be encrypted (string, optional)
const addresses = [ADDRESS1, ADDRESS2, ...] // ADDRESS = source address string; address in wallet to take funds from
const opts = {
  transfers: transfers, // (array, required), ex: [{ address: 'ccx7Xd...', amount: 1000, message: 'tip' }]
  addresses: addresses, // (array, optional), ex: ['ccx7Xd...', 'ccx7Xe...']
  changeAddress: ADDRESS, // change return address (address string, optional if only one address in wallet or only one source address given), ex: 'ccx7Xd...'
  paymentId: PAYMENT_ID, // filter (64-digit hex string, optional), ex: '0ab1...3f4b'
  anonimity: MIX_IN, // input mix count (integer, optional, default 2), ex: 6
  fee: FEE, // (raw CCX integer, optional, default is minimum required), ex: 10
  unlockHeight: UNLOCK_HEIGHT, // block height to unlock payment (integer, optional), ex: 12750
  extra: EXTRA // (variable length string, optional), ex: '123abc'
}
ccx.createDelayedTransaction(opts) // create but do not send transaction
```
#### <a name="getDelayedTransactionHashes">Get delayed transaction hashes (walletd)
```
ccx.getDelayedTransactionHashes()
```
#### <a name="deleteDelayedTransaction">Delete delayed transaction (walletd)
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.deleteDelayedTransaction(hash)
```
#### <a name="sendDelayedTransaction">Send delayed transaction (walletd)
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.sendDelayedTransaction(hash)
```
#### <a name="getMessagesFromExtra">Get incoming messages from transaction extra field (walletd)
```
const extra = EXTRA // (hex string, required), ex: '0199...c3ca'
ccx.getMessagesFromExtra(extra)
```
### <a name="daemon">Daemon RPC (must provide daemonRpcPort)

#### <a name="info">Get info
```
ccx.info() // get information about the block chain, including next block height
```
#### <a name="index">Get index
```
ccx.index() // get next block height
```
#### <a name="count">Get count
```
ccx.count() // get next block height
```
#### <a name="currencyId">Get currency ID
```
ccx.currencyId()
```
#### <a name="blockHashByHeight">Get block hash by height
```
const height = HEIGHT // (integer, required), ex: 12750
ccx.blockHashByHeight(height) // get block hash given height
```
#### <a name="blockHeaderByHeight">Get block header by height
```
const height = HEIGHT // (integer, required), ex: 12750
ccx.blockHeaderByHeight(height) // get block header given height
```
#### <a name="blockHeaderByHash">Get block header by hash
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.blockHeaderByHash(hash) // get block header given hash
```
#### <a name="lastBlockHeader">Get last block header
```
ccx.lastBlockHeader()
```
#### <a name="block">Get block
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.block(hash)
```
#### <a name="blocks">Get blocks
```
const height = HEIGHT // (integer, required), ex: 12750
ccx.blocks(height) // returns 31 blocks up to and including HEIGHT
```
#### <a name="blockTemplate">Get block template
```
const address = ADDRESS // destination address (string, required), ex: 'ccx7Xd...'
const reserveSize = RESERVE_SIZE // bytes to reserve in block for work, etc. (integer < 256, optional, default 14), ex: 255
const opts = {
  address: address,
  reserveSize: reserveSize
}
ccx.blockTemplate(opts)
```
#### <a name="submitBlock">Submit block
```
const block = BLOCK // block blob (hex string, required), ex: '0300cb9eb...'
ccx.submitBlock(block)
```
#### <a name="transaction">Get transaction
```
const hash = HASH // (64-digit hex string, required), ex: '0ab1...3f4b'
ccx.transaction(hash)
```
#### <a name="transactions">Get transactions
```
const arr = [HASH1, HASH2, ...] // (array of 64-digit hex strings, required), ex: ['0ab1...3f4b']
ccx.transactions(arr)
```
#### <a name="transactionPool">Get transaction pool
```
ccx.transactionPool()
```
#### <a name="sendRawTransaction">Send raw transaction
```
const transaction = TRANSACTION // transaction blob (hex string, required), ex: ''01d86301...'
ccx.sendRawTransaction(transaction)
```
