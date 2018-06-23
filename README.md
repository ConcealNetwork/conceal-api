# conceal-js
Javascript/Node.js interface to Conceal cryptocurrency RPC/API. Currenty only the wallet RPC is available.

## Quick start for node.js
```
$ npm install conceal-js
```
Assuming that the Conceal daemon and wallet are installed and that your encrypted wallet.bin file is in the current directory,
```
$ conceald # start the network daemon
$ concealwallet --rpc-bind-port PORT --wallet-file wallet.bin --password PASSWORD # start the wallet
```
Create and run a test program.
```
$ node test.js
```
The test program could contain, for example, a simple payment
```
const CCX = require('conceal-js')
const ccx = new CCX('http://localhost', '3333')

ccx.send({
  address: 'ccx7Xd3NBbBiQNvv7vMLXmGMHyS8AVB6EhWoHo5EbGfR2Ki9pQnRTfEBt3YxYEVqpUCyJgvPjBYHp8N2yZwA7dqb4PjaGWuvs4',
  amount: 1.23
})
.then((res) => { console.log(res) }) // display tx hash upon success
.catch((err) => { console.log(err) }) // display error message upon failure
```
## API
```
const CCX = require('conceal-js')
const ccx = new CCX(host, walletRpcPort, daemonRpcPort)
```
ccx.rpc returns a promise, where *rpc* is any of the methods below:

### Wallet RPC (must provide walletRpcPort)

#### Get height
```
ccx.height() // get last block height
```
#### Get balance
```
ccx.balance // get wallet balances
```
#### Get messages
```
const opts = {
  firstTxId: FIRST_TX_ID, // (integer, optional), ex: 10
  txLimit: TX_LIMIT // maximum number of messages (integer, optional), ex: 10
}
ccx.messages(opts) // opts can be omitted
```
#### Get incoming payments
```
const paymentId = PAYMENT_ID, // (64-digit hexadecimal string, required), ex: '0ab1...3f4b'
ccx.payments(paymentId)
```
#### Get transfers
```
ccx.transfers() // gets all transfers (transactions)
```
#### Reset wallet
```
ccx.reset() // discard wallet cache and resync with block chain
```
#### Store wallet
```
ccx.store() // save wallet cache to disk
```
#### Send payment
```
const opts = {
  address: ADDRESS, // destination address (string, required), ex: 'ccx7Xd...'
  amount: AMOUNT, // payment amount (number, required, decimal), ex: 1.23
  fee: FEE, // (number, optional, default is minimum required), ex: 0.000010
  mixIn: MIX_IN, // input mix count (integer, optional, default 2), ex: 0
  memo: MEMO, // message to be encrypted (string, optional), e.g., ex: 'tip'
  paymentId: PAYMENT_ID, // (64-digit hexadecimal string, optional), ex: '0ab1...3f4b'
  unlockHeight: UNLOCK_HEIGHT // block height to unlock payment (integer, optional), ex: 12750
}
ccx.send(opts)
```
### Daemon RPC (must provide daemonRpcPort)

#### Get info
```
ccx.info() // get information about the block chain, including next block height
```
#### Get index
```
ccx.index() // get next block height
```
#### Get count
```
ccx.count() // get next block height
```
#### Get block hash by height
```
const height = HEIGHT, // (non-negative integer, required), ex: 12750
ccx.blockHashByHeight(height) // get block hash given height
```
#### Get block header by height
```
const height = HEIGHT, // (non-negative integer, required), ex: 12750
ccx.blockHeaderByHeight(height) // get block header given height
```
#### Get block header by hash
```
const hash = HASH, // (64-digit hexadecimal string, required), ex: '0ab1...3f4b'
ccx.blockHeaderByHash(hash) // get block header given hash
```
#### Get last block header
```
ccx.lastBlockHeader()
```
#### Get block
```
const hash = HASH, // (64-digit hexadecimal string, required), ex: '0ab1...3f4b'
ccx.block(hash)
```
#### Get blocks
```
const height = HEIGHT, // (non-negative integer, required), ex: 12750
ccx.blocks(height) // returns 31 blocks up to and including *height*
```
#### Get transaction
```
const hash = HASH, // (64-digit hexadecimal string, required), ex: '0ab1...3f4b'
ccx.transaction(hash)
```
#### Get transaction pool
```
ccx.transactionPool()
```
#### Get currency ID
```
ccx.currencyId()
```
#### Get transactions
```
const arr = [HASH1, HASH2, ...] // (array of 64-digit hexadecimal strings, required), ex: ['0ab1...3f4b']
ccx.transactions(arr)
```
#### Send raw transaction
```
const transaction = TRANSACTION // transaction blob (hexadecimal string, required), ex: ''01d86301...'
ccx.sendRawTransaction(transaction)
```
#### Get block template
```
const address = ADDRESS // destination address (string, required), ex: 'ccx7Xd...'
const reserveSize = RESERVE_SIZE // bytes to reserve in block for work, etc. (non-negative integer < 256, optional, default 14), ex: 255
const opts = {
  address: address,
  reserveSize: reserveSize
}
ccx.blockTemplate(opts)
```
#### Submit block
```
const block = BLOCK // block blob (hexadecimal string, required), ex: '0300cb9eb...'
ccx.submitBlock(block)
```
#### Stop mining
```
ccx.stopMining(block)
```
#### Start mining
```
const address = ADDRESS // mining address (string, required), ex: 'ccx7Xd...'
const threads = THREADS // number of concurrent mining threads (non-negative integer, optional, default 0), ex: 2
const opts = {
  address: address,
  threads: threads
}
ccx.startMining(opts)
```
