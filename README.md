# conceal-js
Javascript/Node.js interface to Conceal cryptocurrency RPC/API. Currenty only the wallet RPC is available.

## Quick start
```
$ npm install conceal-js
```
Assuming that the Conceal daemon and wallet are installed and that your encrypted wallet.bin file is in the current directory,
```
$ conceald # start the network daemon
$ concealwallet --rpc-bind-port PORT --wallet-file wallet.bin --password PASSWORD # start the wallet
```
Assuming that Node.js is installed, create and run a test program.
```
$ node test.js
```
The test program could contain, for example, a simple payment
```
require('conceal-js')

const ccx = new CCX('3333') // Port 3333 on localhost

ccx.send({
  address: 'ccx7Xd3NBbBiQNvv7vMLXmGMHyS8AVB6EhWoHo5EbGfR2Ki9pQnRTfEBt3YxYEVqpUCyJgvPjBYHp8N2yZwA7dqb4PjaGWuvs4',
  amount: 1.23
})
.then((res) => { console.log(res) }) // display tx hash upon success
.catch((err) => { console.log(err) }) // display error message upon failure
```
## API

### Wallet RPC

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
#### Reset wallet
```
ccx.reset() // discard wallet cache and resync with block chain
```
#### Store wallet
```
ccx.store() // save wallet cache to disk
```
#### Get height
```
ccx.height() // get block chain height
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
#### Get payments
```
const paymentId = PAYMENT_ID, // (64-digit hexadecimal string, required), ex: '0ab1...3f4b' 
ccx.payments(paymentId)
```
#### Get transfers
```
ccx.transfers() // gets all transfers (transactions)
```
