module.exports = CCX

const http = require('http')
const https = require('https')

const err = {
  nonNeg: ' must be a non-negative integer',
  nonHex: ' must be a hexadecimal string',
  opts: 'opts must be object',
  hex64: ' must be 64-digit hexadecimal string',
  dec: ' must be decimal amount of CCX',
  addr: 'address must be 98-character string beginning with ccx',
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

// Wallet RPC

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
    if (!opts) opts = {}
    if (typeof opts !== 'object') reject(err.opts)
    else if (opts.firstTxId && !isNonNegative(opts.firstTxId)) reject('firstTxId' + err.nonNeg)
    else if (opts.txLimit && !isNonNegative(opts.txLimit)) reject('txLimit' + err.nonNeg)
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
    if (paymentId && !isHex64String(paymentId)) reject('paymentId' + err.hex64)
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
  const MAX_MIXIN = 10
  const DEFAULT_MIXIN = 2
  const DEFAULT_UNLOCK_TIME = 0
  const DEFAULT_FEE = 10

  return new Promise((resolve, reject) => {
    if (typeof opts !== 'object') reject(err.opts)
    else if (!opts.address || !opts.amount) reject('address and amount are required')
    else if (typeof opts.address != 'string' || opts.address.length !== 98 || opts.address.slice(0, 3) != 'ccx') reject(err.addr)
    else if (!isNumeric(opts.amount)) reject('amount' + err.dec)
    else if (opts.fee && !isNumeric(opts.fee)) reject('fee' + err.dec)
    else if (opts.paymentId && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64)
    else if (opts.memo && typeof opts.memo !== 'string') reject('memo must be string')
    else {
      if (!opts.mixIn) opts.mixIn = DEFAULT_MIXIN
      if(!(opts.mixIn >= 0 && opts.mixIn <= MAX_MIXIN)) reject('0 <= mixIn <= 10')
      else {
        if (!opts.unlockHeight) opts.unlockHeight = DEFAULT_UNLOCK_TIME
        if(!isNonNegative(opts.unlockHeight)) reject('unlockHeight' + err.nonNeg)
        else {
          const d = { address: opts.address, amount: CCXToRaw(opts.amount) }
          if (opts.memo) d.message = opts.memo
          const obj = { destinations: [d], mixin: opts.mixIn, unlock_time: opts.unlockHeight }
          obj.fee = opts.fee ? CCXToRaw(opts.fee) : DEFAULT_FEE
          if (opts.paymentId) obj.payment_id = opts.paymentId
          wrpc(this, 'transfer', obj, resolve, reject)
        }
      }
    }
  })
}

function wrpc (that, method, params, resolve, reject) {
  request(that.protocol, that.host, that.walletRpcPort, buildRpc(method, params), '/json_rpc', resolve, reject)
}

// Daemon RPC - JSON RPC

CCX.prototype.count = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getblockcount', { }, resolve, reject)
  })
}

CCX.prototype.blockHashByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!height || !isNonNegative(height)) reject('height' + err.nonNeg)
    else drpc(this, 'on_getblockhash', [ height ], resolve, reject)
  })
}

CCX.prototype.blockHeaderByHash = function (hash) {
  return new Promise((resolve, reject) => {
    if (!hash || !isHex64String(hash)) reject('hash' + err.hex64)
    else drpc(this, 'getblockheaderbyhash', { hash: hash }, resolve, reject)
  })
}

CCX.prototype.blockHeaderByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!height || !isNonNegative(height)) reject('height' + err.nonNeg)
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
    if (!hash || !isHex64String(hash)) reject('hash' + err.hex64)
    else drpc(this, 'f_block_json', { hash: hash }, resolve, reject)
  })
}

CCX.prototype.blocks = function (height) {
  return new Promise((resolve, reject) => {
    if (!height || !isNonNegative(height)) reject('height' + err.nonNeg)
    else drpc(this, 'f_blocks_list_json', { height: height }, resolve, reject)
  })
}

CCX.prototype.transaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!hash || !isHex64String(hash)) reject('hash' + err.hex64)
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
    if (typeof opts !== 'object') reject(err.opts)
    else if (!opts.address || !opts.reserveSize) reject('address and reserveSize are required')
    else if (typeof opts.address != 'string' || opts.address.length !== 98 || opts.address.slice(0, 3) != 'ccx') reject(err.addr)
    else if (!isNonNegative(opts.reserveSize) || opts.reserveSize > 255) reject('0 <= reserveSize <= 255')
    else drpc(this, 'getblocktemplate', { wallet_address: opts.address, reserve_size: opts.reserveSize }, resolve, reject)
  })
}

CCX.prototype.submitBlock = function (block) {
  return new Promise((resolve, reject) => {
    if (!block || !isHexString(block)) reject('block' + err.nonHex)
    else drpc(this, 'submitblock', [block], resolve, reject)
  })
}

function drpc (that, method, params, resolve, reject) {
  request(that.protocol, that.host, that.daemonRpcPort, buildRpc(method, params), '/json_rpc', resolve, reject)
}

// Daemon RPC - JSON handlers

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
    if (typeof opts !== 'object') reject(err.opts)
    else if (!opts.address || !opts.threads) reject('address and threads are required')
    else if (typeof opts.address != 'string' || opts.address.length !== 98 || opts.address.slice(0, 3) != 'ccx') reject('address' + err.addr)
    else if(!isNonNegative(opts.threads)) reject('unlockHeight' + err.nonNeg)
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
    if (!Array.isArray(txs)) reject('txs is required and must be an array of transactions')
    else {
      let i
      for (i = 0; i < txs.length; i++) { if (!isHex64String(txs[i])) break; }
      if (i < txs.length) reject('each transaction' + err.hex64)
      else hrpc(this, { txs_hashes: txs }, '/gettransactions', resolve, reject)
    }
  })
}

CCX.prototype.sendRawTransaction = function (rawTx) {
  return new Promise((resolve, reject) => {
    if (!rawTx || !isHexString(rawTx)) reject('rawTx' + err.nonHex)
    else hrpc(this, { tx_as_hex: rawTx }, '/sendrawtransaction', resolve, reject)
  })
}

function hrpc (that, params, path, resolve, reject) {
  request(that.protocol, that.host, that.daemonRpcPort, JSON.stringify(params), path, resolve, reject)
}

// Utilities

function isNonNegative (n) { return (Number.isInteger(n) && n >= 0) }

function isNumeric (n) { return !isNaN(parseFloat(n)) && isFinite(n) }

function isHex64String (str) { return (typeof str === 'string' && /[0-9a-fA-F]{64}/.test(str)) }

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
          if (data.error) { reject(data.error.message) }
        } catch (error) { reject(error.message); return }
        if (data.result) data = data.result
        resolve(data)
      })
    }
  ).on('error', (error) => { reject('RPC server error') }).end(post)
}
