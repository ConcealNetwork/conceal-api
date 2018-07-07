module.exports = CCX

const http = require('http')
const https = require('https')

const MAX_MIXIN = 10
const DEFAULT_MIXIN = 2
const DEFAULT_UNLOCK_TIME = 0
const DEFAULT_FEE = 10 // raw X
const DEFAULT_MEMO_CHARACTER_FEE = 10 // raw X

const err = {
  nonNeg: ' must be a non-negative integer',
  hex: ' must be a hexadecimal string',
  opts: 'opts must be object',
  hex64: ' must be 64-digit hexadecimal string',
  addr: ' must be 98-character string beginning with ccx',
  raw: ' must be a raw amount of CCX (X)',
  trans: ' must be a transfer object { address: 98-character string beginning with ccx, amount: raw amount of CCX (X) }',
  arr:  ' must be an array',
  str: ' must be a string'
}

function CCX (host, walletRpcPort, daemonRpcPort) {
  if (!host) throw 'host required'
  const parse = host.match(/^([^:]*):\/\/(.*)$/)
  if (parse[1] === 'http') this.protocol = http
  else if (parse[1] === 'https') this.protocol = https
  else throw 'host must begin with http(s)://'
  this.host = parse[2]
  this.walletRpcPort = walletRpcPort
  this.daemonRpcPort = daemonRpcPort
}

// Wallet RPC -- concealwallet

function wrpc (that, method, params, resolve, reject) {
  request(that.protocol, that.host, that.walletRpcPort, buildRpc(method, params), '/json_rpc', resolve, reject)
}

CCX.prototype.height = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'get_height', { }, resolve, reject)
  })
}

CCX.prototype.balance = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getbalance', { }, resolve, reject)
  })
}

CCX.prototype.messages = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) opts = {}
    else if (!isUndefined(opts.firstTxId) && !isNonNegative(opts.firstTxId)) reject('firstTxId' + err.nonNeg)
    else if (!isUndefined(opts.txLimit) && !isNonNegative(opts.txLimit)) reject('txLimit' + err.nonNeg)
    else {
      obj = {}
      if (opts.firstTxId) obj.first_tx_id = opts.firstTxId
      if (opts.txLimit) obj.tx_limit = opts.txLimit
      wrpc(this, 'get_messages', obj, resolve, reject)
    }
  })
}

CCX.prototype.payments = function (paymentId) { // incoming payments
  return new Promise((resolve, reject) => {
    if (!isHex64String(paymentId)) reject('paymentId' + err.hex64)
    else wrpc(this, 'get_payments', { payment_id: paymentId }, resolve, reject)
  })
}

CCX.prototype.transfers = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'get_transfers', { }, resolve, reject)
  })
}

CCX.prototype.store = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'store', { }, resolve, reject)
  })
}

CCX.prototype.reset = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'reset', { }, resolve, reject)
  })
}

CCX.prototype.send = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts)
    else if (isUndefined(opts.transfers) || !arrayTest(opts.transfers, isTransfer)) reject('transfers' + err.arr + ' of transfers which' + err.trans)
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64)
    else {
      if (isUndefined(opts.mixIn)) opts.mixIn = DEFAULT_MIXIN
      if(!(opts.mixIn >= 0 && opts.mixIn <= MAX_MIXIN)) reject('0 <= mixIn <= ' + MAX_MIXIN)
      else {
        if (isUndefined(opts.unlockHeight)) opts.unlockHeight = DEFAULT_UNLOCK_TIME
        if (!isNonNegative(opts.unlockHeight)) reject('unlockHeight' + err.nonNeg)
        else {
          if (isUndefined(opts.fee)) opts.fee = DEFAULT_FEE + (!isUndefined(opts.memo) ? opts.memo.length * DEFAULT_MEMO_CHARACTER_FEE : 0)
          if (!isNonNegative(opts.fee)) reject('fee' + err.raw)
          else {
            const obj = { destinations: opts.transfers, mixin: opts.mixIn, fee: opts.fee, unlock_time: opts.unlockHeight }
            if (opts.paymentId) obj.payment_id = opts.paymentId
            wrpc(this, 'transfer', obj, resolve, reject)
          }
        }
      }
    }
  })
}

// Wallet RPC -- walletd

CCX.prototype.status = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getStatus', { }, resolve, reject)
  })
}

CCX.prototype.getTransactions = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts)
    else if (!isNonNegative(opts.blockCount)) reject('blockCount' + err.nonNeg)
    else if (isUndefined(opts.firstBlockIndex) && isUndefined(opts.blockHash)) reject('either firstBlockIndex or blockHash is required')
    else if (!isUndefined(opts.firstBlockIndex) && !isNonNegative(opts.firstBlockIndex)) reject('firstBlockIndex' + err.nonNeg)
    else if (!isUndefined(opts.blockHash) && !isHex64String(opts.blockHash)) reject('blockHash' + err.hex64)
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64)
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses which' + err.addr)
    else {
      const obj = {
        blockHash: opts.blockHash,
        firstBlockIndex: opts.firstBlockIndex,
        blockCount: opts.blockCount,
        addresses: opts.addresses,
        paymentId: opts.paymentId
      }
      wrpc(this, 'getTransactions', obj, resolve, reject)
    }
  })
}

// Daemon RPC - JSON RPC

function drpc (that, method, params, resolve, reject) {
  request(that.protocol, that.host, that.daemonRpcPort, buildRpc(method, params), '/json_rpc', resolve, reject)
}

CCX.prototype.count = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getblockcount', { }, resolve, reject)
  })
}

CCX.prototype.blockHashByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg)
    else drpc(this, 'on_getblockhash', [ height ], resolve, reject)
  })
}

CCX.prototype.blockHeaderByHash = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64)
    else drpc(this, 'getblockheaderbyhash', { hash: hash }, resolve, reject)
  })
}

CCX.prototype.blockHeaderByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg)
    else drpc(this, 'getblockheaderbyheight', { height: height }, resolve, reject)
  })
}

CCX.prototype.lastBlockHeader = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getlastblockheader', { }, resolve, reject)
  })
}

CCX.prototype.block = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64)
    else drpc(this, 'f_block_json', { hash: hash }, resolve, reject)
  })
}

CCX.prototype.blocks = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg)
    else drpc(this, 'f_blocks_list_json', { height: height }, resolve, reject)
  })
}

CCX.prototype.transaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64)
    else drpc(this, 'f_transaction_json', { hash: hash }, resolve, reject)
  })
}

CCX.prototype.transactionPool = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'f_on_transactions_pool_json', { }, resolve, reject)
  })
}

CCX.prototype.currencyId = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getcurrencyid', { }, resolve, reject)
  })
}

CCX.prototype.blockTemplate = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts)
    else if (!isAddress(opts.address)) reject('address' + err.addr)
    else if (!isNonNegative(opts.reserveSize) || opts.reserveSize > 255) reject('0 <= reserveSize <= 255')
    else drpc(this, 'getblocktemplate', { wallet_address: opts.address, reserve_size: opts.reserveSize }, resolve, reject)
  })
}

CCX.prototype.submitBlock = function (block) {
  return new Promise((resolve, reject) => {
    if (!isHexString(block)) reject('block' + err.hex)
    else drpc(this, 'submitblock', [block], resolve, reject)
  })
}

// Daemon RPC - JSON handlers

function hrpc (that, params, path, resolve, reject) {
  request(that.protocol, that.host, that.daemonRpcPort, JSON.stringify(params), path, resolve, reject)
}

CCX.prototype.info = function () {
  return new Promise((resolve, reject) => {
    hrpc(this, { }, '/getinfo', resolve, reject)
  })
}

CCX.prototype.index = function () {
  return new Promise((resolve, reject) => {
    hrpc(this, { }, '/getheight', resolve, reject)
  })
}

CCX.prototype.startMining = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts)
    else if (!isAddress(opts.address)) reject('address' + err.addr)
    else if (!isNonNegative(opts.threads)) reject('unlockHeight' + err.nonNeg)
    else hrpc(this, { miner_address: opts.address, threads_count: opts.threads }, '/start_mining', resolve, reject)
  })
}

CCX.prototype.stopMining = function () {
  return new Promise((resolve, reject) => {
    hrpc(this, { }, '/stop_mining', resolve, reject)
  })
}

CCX.prototype.transactions = function (txs) {
  return new Promise((resolve, reject) => {
    if (!arrayTest(txs, isHex64String)) reject('txs' + err.arr + ' of transactions which ' + err.hex64)
    else hrpc(this, { txs_hashes: txs }, '/gettransactions', resolve, reject)
  })
}

CCX.prototype.sendRawTransaction = function (rawTx) {
  return new Promise((resolve, reject) => {
    if (!isHexString(rawTx)) reject('rawTx' + err.hex)
    else hrpc(this, { tx_as_hex: rawTx }, '/sendrawtransaction', resolve, reject)
  })
}

// Utilities

function arrayTest(arr, test) {
  if (!Array.isArray(arr)) return false
  let i
  for (i = 0; i < arr.length; i++) { if (!test(arr[i])) break; }
  if (i < arr.length) return false
  return true
}

function isObject (obj) { return typeof obj === 'object' }

function isUndefined (obj) { return typeof obj === 'undefined' }

function isTransfer (obj) { return isObject(obj) && !isUndefined(obj.address) && isAddress(obj.address) && !isUndefined(obj.amount) && isNonNegative(obj.amount) }

function isNonNegative (n) { return (Number.isInteger(n) && n >= 0) }

function isNumeric (n) { return !isNaN(parseFloat(n)) && isFinite(n) }

function isAddress (str) { return (typeof str === 'string' &&  str.length === 98 && str.slice(0, 3) === 'ccx') }

function isHex64String (str) { return (typeof str === 'string' && /^[0-9a-fA-F]{64}$/.test(str)) }

function isHexString (str) { return (typeof str === 'string' && !/[^0-9a-fA-F]/.test(str)) }

function CCXToRaw (ccx) { return Math.round(1000000 * parseFloat(ccx)) }

function buildRpc (method, params) { return '{"jsonrpc":"2.0","id":"0","method":"' + method + '","params":'+ JSON.stringify(params) + '}' }

function request (protocol, host, port, post, path, resolve, reject) {
  const obj = {
    hostname: host,
    port: port,
    method: 'POST',
    path: path,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': post.length,
    }
  }
  protocol.request(
    obj,
    (res) => {
      let data = Buffer.alloc(0)
      res.on('data', (chunk) => { data = Buffer.concat([data, chunk]) })
      res.on('end', () => {
        try {
          data = JSON.parse(data.toString())
          if (data.error) { reject(data.error.message); return }
        } catch (error) { reject(error.message); return }
        if (data.result) data = data.result
        resolve(data)
      })
    }
  ).on('error', (error) => { reject('RPC server error') }).end(post)
}
