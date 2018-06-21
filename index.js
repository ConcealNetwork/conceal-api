module.exports = CCX

const http = require('http')

const MAX_MIXIN = 10
const DEFAULT_MIXIN = 2
const DEFAULT_UNLOCK_TIME = 0
const DEFAULT_FEE = 10

function CCX (walletRpcPort) {
  if (!walletRpcPort) throw 'walletRpcPort required'
  this.walletRpcPort = walletRpcPort
}

CCX.prototype.messages = function (opts) {
  return new Promise((resolve, reject) => {
    if (!opts) opts = {}
    if (typeof opts !== 'object') reject('opts must be object')
    else if (opts.firstTxId && (!Number.isInteger(opts.firstTxId) || opts.firstTxId < 0)) reject('firstTxId must be a non-negative integer')
    else if (opts.txLimit && (!Number.isInteger(opts.txLimit) || opts.txLimit < 0)) reject('txLimit must be a non-negative integer')
    else {
      obj = {}
      if (opts.firstTxId) obj.first_tx_id = opts.firstTxId
      if (opts.txLimit) obj.tx_limit = opts.txLimit
      this.rpc(
        'get_messages',
        obj,
        resolve,
        reject
      )
    }
  })
}

CCX.prototype.payments = function (paymentId) { // incoming payments
  return new Promise((resolve, reject) => {
    if (paymentId && (typeof paymentId !== 'string' || !/[0-9a-fA-F]{64}/.test(paymentId))) reject('paymentId must be 64-digit hexadecimal string')
    else {
      this.rpc(
        'get_payments',
        { payment_id: paymentId },
        resolve,
        reject
      )
    }
  })
}

CCX.prototype.transfers = function () {
  return new Promise((resolve, reject) => {
    this.rpc(
      'get_transfers',
      { },
      resolve,
      reject
    )
  })
}

CCX.prototype.store = function () {
  return new Promise((resolve, reject) => {
    this.rpc(
      'store',
      { },
      resolve,
      reject
    )
  })
}

CCX.prototype.reset = function () {
  return new Promise((resolve, reject) => {
    this.rpc(
      'reset',
      { },
      resolve,
      reject
    )
  })
}

CCX.prototype.height = function () {
  return new Promise((resolve, reject) => {
    this.rpc(
      'get_height',
      { },
      resolve,
      reject
    )
  })
}

CCX.prototype.balance = function () {
  return new Promise((resolve, reject) => {
    this.rpc(
      'getbalance',
      { },
      resolve,
      reject
    )
  })
}

CCX.prototype.send = function (opts) {
  return new Promise((resolve, reject) => {
    if (typeof opts !== 'object') reject('opts must be object')
    else if (!opts.address || !opts.amount) reject('address and amount are required')
    else if (typeof opts.address != 'string' || opts.address.length !== 98 || opts.address.slice(0, 3) != 'ccx') reject('address must be 98-character string beginning with ccx')
    else if (!isNumeric(opts.amount)) reject('amount must be decimal amount of CCX')
    else if (opts.fee && !isNumeric(opts.fee)) reject('fee must be decimal amount of CCX')
    else if (opts.paymentId && (typeof opts.paymentId !== 'string' || !/[0-9a-fA-F]{64}/.test(opts.paymentId))) reject('paymentId must be 64-digit hexadecimal string')
    else if (opts.memo && typeof opts.memo !== 'string') reject('memo must be string')
    else {
      if (!opts.mixIn) opts.mixIn = DEFAULT_MIXIN
      if(!(opts.mixIn >= 0 && opts.mixIn <= MAX_MIXIN)) reject('0 <= mixIn <= 10')
      else {
        if (!opts.unlockHeight) opts.unlockHeight = DEFAULT_UNLOCK_TIME
        if(!Number.isInteger(opts.unlockHeight) || opts.unlockHeight < 0) reject('unlockHeight must be a non-negative integer')
        else {
          const d = { address: opts.address, amount: CCXToRaw(opts.amount) }
          if (opts.memo) d.message = opts.memo
          const obj = { destinations: [d], mixin: opts.mixIn, unlock_time: opts.unlockHeight }
          obj.fee = opts.fee ? CCXToRaw(opts.fee) : DEFAULT_FEE
          if (opts.paymentId) obj.payment_id = opts.paymentId
          this.rpc(
            'transfer',
            obj,
            resolve,
            reject
          )
        }
      }
    }
  })
}

CCX.prototype.rpc  = function (method, params, resolve, reject) {
  request(
    this.walletRpcPort,
    '{"jsonrpc":"2.0","id":"0","method":"' + method + '","params":'+ JSON.stringify(params) + '}',
    resolve,
    reject
  )
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function CCXToRaw (ccx) { return Math.floor(1000000 * parseFloat(ccx)) }

function request (port, post, resolve, reject) {
  const obj = {
    hostname: 'localhost',
    port: port,
    method: 'POST',
    path: '/json_rpc',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': post.length,
    }
  }
  http.request(
    obj,
    (res) => {
      let data = Buffer.alloc(0)
      res.on('data', (chunk) => { data = Buffer.concat([data, chunk]) })
      res.on('end', () => {
        try { data = JSON.parse(data.toString()) } catch (err) { reject(err.message); return }
        resolve(data.result)
      })
    }
  ).on('error', (err) => { reject('http error') }).end(post)
}
