module.exports = CCX;

const { http, https } = require('follow-redirects');
const url = require('url');

const MAX_MIXIN = 5;
const MIN_MIXIN = 3;
const DEFAULT_UNLOCK_HEIGHT = 10;
const DEFAULT_FEE = 1000; // raw X
const DEFAULT_CHARACTER_FEE = 10; // raw X

const err = {
  nonNeg: ' must be a non-negative integer',
  hex: ' must be a hexadecimal string',
  opts: 'opts must be object',
  hex64: ' must be 64-digit hexadecimal string',
  addr: ' must be 98-character string beginning with ccx',
  intAddr:  ' must be 186-character string beginning with ccx',
  raw: ' must be a raw amount of CCX (X)',
  privKey: ' must be a 64-character string',
  trans: ' must be a transfer object { address: 98-character string beginning with ccx, amount: raw amount of CCX (X), message: optional string }',
  arr: ' must be an array',
  str: ' must be a string'
};

function CCX(params) {
  if (!params) throw 'parameters are required';
  if (typeof params != 'object') throw 'parameters must be a JSON object';

  // parse both daemon and wallet urls
  const parseDaemon = params.daemonHost ? new URL(params.daemonHost) : null;
  const parseWallet = params.walletHost ? new URL(params.walletHost) : null;

  if (parseDaemon) {
    if (parseDaemon.protocol === 'http:') this.daemonProtocol = http;    
    else if (parseDaemon.protocol === 'https:') this.daemonProtocol = https;
    else throw 'Daemon host must begin with http(s)://';
  }

  if (parseWallet) {
    if (parseWallet.protocol === 'http:') this.walletProtocol = http;
    else if (parseWallet.protocol === 'https:') this.walletProtocol = https;
    else throw 'Wallet host must begin with http(s)://';
  }

  this.daemonHost = parseDaemon ? parseDaemon.host : null;
  this.walletHost = parseWallet ? parseWallet.host : null;
  this.daemonPath = parseDaemon ? parseDaemon.pathname : null;
  this.walletPath = parseWallet ? parseWallet.pathname : null;
  this.walletRpcPort = params.walletRpcPort;
  this.daemonRpcPort = params.daemonRpcPort;
  this.walletRpcUser = params.walletRpcUser;
  this.walletRpcPass = params.walletRpcPass;
  this.timeout = params.timeout || 5000;

  // check daemon path and if its empty set it to emty string
  if ((this.daemonPath == '/') || (!this.daemonPath)) {
    this.daemonPath = "";
  }

  // check wallet path and if its empty set it to emty string
  if ((this.walletPath == '/') || (!this.walletPath)) {
    this.walletPath = "";
  }

  // check daemon port and if its empty set it to 80 or 433
  if (!this.daemonRpcPort) {
    if (this.daemonProtocol == http) {
      this.daemonRpcPort = 80;
    } else if (this.daemonProtocol == https) {
      this.daemonRpcPort = 443;
    }
  }

  console.log()
}

// Wallet RPC -- concealwallet

function wrpc(that, method, params, resolve, reject) {
  request(that.walletProtocol, that.walletHost, that.walletRpcPort, 'POST', that.timeout, buildRpc(method, params), that.walletPath + '/json_rpc', that.walletRpcUser, that.walletRpcPass, resolve, reject);
}

CCX.prototype.outputs = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'get_outputs', {}, resolve, reject);
  });
};

CCX.prototype.height = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'get_height', {}, resolve, reject);
  });
};

CCX.prototype.balance = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getbalance', {}, resolve, reject);
  });
};

CCX.prototype.messages = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) opts = {};
    else if (!isUndefined(opts.firstTxId) && !isNonNegative(opts.firstTxId)) reject('firstTxId' + err.nonNeg);
    else if (!isUndefined(opts.txLimit) && !isNonNegative(opts.txLimit)) reject('txLimit' + err.nonNeg);
    else {
      obj = {
        first_tx_id: opts.firstTxId,
        tx_limit: opts.txLimit
      };
      wrpc(this, 'get_messages', obj, resolve, reject);
    }
  });
};

CCX.prototype.payments = function (paymentId) { // incoming payments
  return new Promise((resolve, reject) => {
    if (!isHex64String(paymentId)) reject('paymentId' + err.hex64);
    else wrpc(this, 'get_payments', { payment_id: paymentId }, resolve, reject);
  });
};

CCX.prototype.transfers = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'get_transfers', {}, resolve, reject);
  });
};

CCX.prototype.store = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'store', {}, resolve, reject);
  });
};

CCX.prototype.reset = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'reset', {}, resolve, reject);
  });
};

CCX.prototype.save = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'save', {}, resolve, reject);
  });
};

CCX.prototype.optimize = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'optimize', {}, resolve, reject);
  });
};

CCX.prototype.send = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.transfers) || !arrayTest(opts.transfers, isTransfer)) reject('transfers' + err.arr + ' of transfers each of which' + err.trans);
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64);
    else {
      if (isUndefined(opts.mixIn)) opts.mixIn = MIN_MIXIN;
      if (!(opts.mixIn >= MIN_MIXIN && opts.mixIn <= MAX_MIXIN)) reject(MIN_MIXIN + ' <= mixIn <= ' + MAX_MIXIN);
      else {
        if (isUndefined(opts.unlockHeight)) opts.unlockHeight = DEFAULT_UNLOCK_HEIGHT;
        if (!isNonNegative(opts.unlockHeight)) reject('unlockHeight' + err.nonNeg);
        else {
          if (isUndefined(opts.fee)) {
            opts.fee = DEFAULT_FEE;
            opts.transfers.forEach((transfer) => {
              opts.fee += (!isUndefined(transfer.message) ? transfer.message.length * DEFAULT_CHARACTER_FEE : 0);
            });
          }
          if (!isNonNegative(opts.fee)) reject('fee' + err.raw);
          else {
            const obj = {
              destinations: opts.transfers,
              mixin: opts.mixIn,
              fee: opts.fee,
              unlock_time: opts.unlockHeight,
              payment_id: opts.paymentId
            };
            wrpc(this, 'transfer', obj, resolve, reject);
          }
        }
      }
    }
  });
};

// Wallet RPC -- walletd

CCX.prototype.resetOrReplace = function (viewSecretKey) {
  return new Promise((resolve, reject) => {
    if (!isUndefined(viewSecretKey) && !isHex64String(viewSecretKey)) reject('viewSecretKey' + err.hex64);
    else wrpc(this, 'reset', { viewSecretKey: viewSecretKey }, resolve, reject);
  });
};

CCX.prototype.status = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getStatus', {}, resolve, reject);
  });
};

CCX.prototype.getBalance = function (address) {
  return new Promise((resolve, reject) => {
    if (isUndefined(address) || !isAddress(address)) reject('address' + err.addr);
    else wrpc(this, 'getBalance', { address: address }, resolve, reject);
  });
};

CCX.prototype.createAddress = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'createAddress', {}, resolve, reject);
  });
};

CCX.prototype.createAddressList = function () {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.privateSpendKeys) || !arrayTest(opts.transfers, isPrivateKey)) reject('privateSpendKeys' + err.arr + ' of keys each of which' + err.privKey);
    else {
      wrpc(this, 'createAddressList', opts, resolve, reject);
    }
  });
};

CCX.prototype.createIntegrated = function (address, paymentId) {
  return new Promise((resolve, reject) => {
    if (isUndefined(address) || !isAddress(address)) reject('address' + err.addr);
    if (isUndefined(paymentId) || !isHex64String(paymentId)) reject('paymentId' + err.hex64);
    wrpc(this, 'createIntegrated', { address: address, payment_id: paymentId }, resolve, reject);
  });
};

CCX.prototype.splitIntegrated = function (address) {
return new Promise((resolve, reject) => {
if (isUndefined(address) || !isIntAddress(address)) reject('address' + err.intAddr);
wrpc(this, 'splitIntegrated', { integrated_address: address }, resolve, reject);
});
};

CCX.prototype.deleteAddress = function (address) {
  return new Promise((resolve, reject) => {
    if (isUndefined(address) || !isAddress(address)) reject('address' + err.addr);
    wrpc(this, 'deleteAddress', { address: address }, resolve, reject);
  });
};

CCX.prototype.getAddresses = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getAddresses', {}, resolve, reject);
  });
};

CCX.prototype.getViewSecretKey = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getViewKey', {}, resolve, reject);
  });
};

CCX.prototype.getSpendKeys = function (address) {
  return new Promise((resolve, reject) => {
    if (isUndefined(address) || !isAddress(address)) reject('address' + err.addr);
    else wrpc(this, 'getSpendKeys', { address: address }, resolve, reject);
  });
};

CCX.prototype.getBlockHashes = function (firstBlockIndex, blockCount) {
  return new Promise((resolve, reject) => {
    if (isUndefined(firstBlockIndex) || !isNonNegative(firstBlockIndex)) reject('firstBlockIndex' + err.nonNeg);
    else if (isUndefined(blockCount) || !isNonNegative(blockCount)) reject('blockCount' + err.nonNeg);
    else wrpc(this, 'getBlockHashes', { firstBlockIndex: firstBlockIndex, blockCount: blockCount }, resolve, reject);
  });
};

CCX.prototype.getTransaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else wrpc(this, 'getTransaction', { transactionHash: hash }, resolve, reject);
  });
};

CCX.prototype.getUnconfirmedTransactionHashes = function (addresses) {
  return new Promise((resolve, reject) => {
    if (!isUndefined(addresses) && !arrayTest(addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else wrpc(this, 'getUnconfirmedTransactionHashes', { addresses: addresses }, resolve, reject);
  });
};

CCX.prototype.getTransactionHashes = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (!isNonNegative(opts.blockCount)) reject('blockCount' + err.nonNeg);
    else if (isUndefined(opts.firstBlockIndex) && isUndefined(opts.blockHash)) reject('either firstBlockIndex or blockHash is required');
    else if (!isUndefined(opts.firstBlockIndex) && !isNonNegative(opts.firstBlockIndex)) reject('firstBlockIndex' + err.nonNeg);
    else if (!isUndefined(opts.blockHash) && !isHex64String(opts.blockHash)) reject('blockHash' + err.hex64);
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64);
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else wrpc(this, 'getTransactionHashes', opts, resolve, reject);
  });
};

CCX.prototype.getTransactions = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (!isNonNegative(opts.blockCount)) reject('blockCount' + err.nonNeg);
    else if (isUndefined(opts.firstBlockIndex) && isUndefined(opts.blockHash)) reject('either firstBlockIndex or blockHash is required');
    else if (!isUndefined(opts.firstBlockIndex) && !isNonNegative(opts.firstBlockIndex)) reject('firstBlockIndex' + err.nonNeg);
    else if (!isUndefined(opts.blockHash) && !isHex64String(opts.blockHash)) reject('blockHash' + err.hex64);
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64);
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else wrpc(this, 'getTransactions', opts, resolve, reject);
  });
};

CCX.prototype.sendTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.transfers) || !arrayTest(opts.transfers, isTransfer)) reject('transfers' + err.arr + ' of transfers each of which' + err.trans);
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else if (!isUndefined(opts.changeAddress) && !isAddress(opts.changeAddress)) reject('changeAddress' + err.addr);
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64);
    else if (!isUndefined(opts.extra) && !isString(opts.extra)) reject('extra' + err.str);
    else {
      opts.sourceAddresses = opts.addresses; delete opts.addresses;
      if (isUndefined(opts.mixIn)) opts.mixIn = MIN_MIXIN;
      if (!(opts.mixIn >= MIN_MIXIN && opts.mixIn <= MAX_MIXIN)) reject(MIN_MIXIN + ' <= mixIn <= ' + MAX_MIXIN);
      else {
        opts.anonymity = opts.mixIn; delete opts.mixIn;
        if (isUndefined(opts.unlockHeight)) opts.unlockHeight = DEFAULT_UNLOCK_HEIGHT;
        if (!isNonNegative(opts.unlockHeight)) reject('unlockHeight' + err.nonNeg);
        else {
          opts.unlockTime = opts.unlockHeight; delete opts.unlockHeight;
          if (isUndefined(opts.fee)) {
            opts.fee = DEFAULT_FEE;
            opts.transfers.forEach((transfer) => {
              opts.fee += (!isUndefined(transfer.message) ? transfer.message.length * DEFAULT_CHARACTER_FEE : 0);
            });
          }
          if (!isNonNegative(opts.fee)) reject('fee' + err.raw);
          else wrpc(this, 'sendTransaction', opts, resolve, reject);
        }
      }
    }
  });
};

CCX.prototype.estimateFusion = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.threshold)) reject('treshold param is mandatory');
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else {
      if (Number.isInteger(opts.threshold)) {
        wrpc(this, 'estimateFusion', opts, resolve, reject);
      } else {
        reject('treshold must be an integer');
      }
    }
  });
};

CCX.prototype.sendFusionTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.threshold)) reject('treshold param is mandatory');
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else {
      opts.sourceAddresses = opts.addresses; delete opts.addresses;
      if (isUndefined(opts.mixIn)) opts.mixIn = MIN_MIXIN;
      if (!(opts.mixIn >= MIN_MIXIN && opts.mixIn <= MAX_MIXIN)) reject(MIN_MIXIN + ' <= mixIn <= ' + MAX_MIXIN);
      else {
        if ((opts.addresses.length == 1) && (!opts.destinationAddress)) {
          opts.destinationAddress = opts.addresses[0];
        } 
        
        if (!opts.destinationAddress) {
          reject('destinationAddress must be specified in case you have more then one source address');
        } else {
          wrpc(this, 'sendFusionTransaction', opts, resolve, reject);
        }
      }
    }
  });
};

CCX.prototype.createDeposit = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.sourceAddress)) reject('sourceAddress param is mandatory');
    else if (isUndefined(opts.amount)) reject('amount param is mandatory');
    else if (isUndefined(opts.term)) reject('term param is mandatory');
    else {
      if (!isAddress(opts.sourceAddress)) reject('sourceAddress is not a valid address');      
      else if (!Number.isInteger(opts.term)) reject('term is not a valid integer');  
      else if (!isNumeric(opts.amount)) reject('amount is not a valid number');  
      else {
        wrpc(this, 'createDeposit', opts, resolve, reject);
      }
    }
  });
};

CCX.prototype.sendDeposit = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.destinationAddress)) reject('destinationAddress param is mandatory');
    else if (isUndefined(opts.sourceAddress)) reject('sourceAddress param is mandatory');
    else if (isUndefined(opts.amount)) reject('amount param is mandatory');
    else if (isUndefined(opts.term)) reject('term param is mandatory');
    else {
      if (!isAddress(opts.destinationAddress)) reject('destinationAddress is not a valid address');      
      else if (!isAddress(opts.sourceAddress)) reject('sourceAddress is not a valid address');      
      else if (!Number.isInteger(opts.term)) reject('term is not a valid integer');  
      else if (!isNumeric(opts.amount)) reject('amount is not a valid number');  
      else {
        wrpc(this, 'sendDeposit', opts, resolve, reject);
      }
    }
  });
};

CCX.prototype.getDeposit = function (id) {
  return new Promise((resolve, reject) => {
    if (isUndefined(id)) reject('depositId param is mandatory');
    else {
      if (!Number.isInteger(id)) reject('depositId is not a valid integer');  
      else {
        wrpc(this, 'getDeposit', { depositId: id }, resolve, reject);
      }
    }
  });
};

CCX.prototype.withdrawDeposit = function (id) {
  return new Promise((resolve, reject) => {
    if (isUndefined(id)) reject('depositId param is mandatory');
    else {
      if (!Number.isInteger(id)) reject('depositId is not a valid integer');  
      else {
        wrpc(this, 'withdrawDeposit', { depositId: id }, resolve, reject);
      }
    }
  });
};

CCX.prototype.createDelayedTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.transfers) || !arrayTest(opts.transfers, isTransfer)) reject('transfers' + err.arr + ' of transfers each of which' + err.trans);
    else if (!isUndefined(opts.addresses) && !arrayTest(opts.addresses, isAddress)) reject('addresses' + err.arr + ' of addresses each of which' + err.addr);
    else if (!isUndefined(opts.changeAddress) && !isAddress(opts.changeAddress)) reject('changeAddress' + err.addr);
    else if (!isUndefined(opts.paymentId) && !isHex64String(opts.paymentId)) reject('paymentId' + err.hex64);
    else if (!isUndefined(opts.extra) && !isString(opts.extra)) reject('extra' + err.str);
    else {
      if (isUndefined(opts.mixIn)) opts.mixIn = MIN_MIXIN;
      if (!(opts.mixIn >= MIN_MIXIN && opts.mixIn <= MAX_MIXIN)) reject(MIN_MIXIN + ' <= mixIn <= ' + MAX_MIXIN);
      else {
        opts.anonymity = opts.mixIn; delete opts.mixIn;
        if (isUndefined(opts.unlockHeight)) opts.unlockHeight = DEFAULT_UNLOCK_HEIGHT;
        if (!isNonNegative(opts.unlockHeight)) reject('unlockHeight' + err.nonNeg);
        else {
          opts.unlockTime = opts.unlockHeight; delete opts.unlockHeight;
          if (isUndefined(opts.fee)) opts.fee = DEFAULT_FEE * opts.transfers.length;
          if (!isNonNegative(opts.fee)) reject('fee' + err.raw);
          else wrpc(this, 'createDelayedTransaction', opts, resolve, reject);
        }
      }
    }
  });
};

CCX.prototype.getDelayedTransactionHashes = function () {
  return new Promise((resolve, reject) => {
    wrpc(this, 'getDelayedTransactionHashes', {}, resolve, reject);
  });
};

CCX.prototype.deleteDelayedTransaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else wrpc(this, 'deleteDelayedTransaction', { transactionHash: hash }, resolve, reject);
  });
};

CCX.prototype.sendDelayedTransaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else wrpc(this, 'sendDelayedTransaction', { transactionHash: hash }, resolve, reject);
  });
};

CCX.prototype.getMessagesFromExtra = function (extra) {
  return new Promise((resolve, reject) => {
    if (!isHexString(extra)) reject('extra' + err.hex);
    else wrpc(this, 'getMessagesFromExtra', { extra: extra }, resolve, reject);
  });
};

CCX.prototype.exportWallet = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.exportFilename)) reject('exportFilename is mandatory');
    else {
      wrpc(this, 'exportWallet', opts, resolve, reject);
    }
  });
};

CCX.prototype.exportWalletKeys = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (isUndefined(opts.exportFilename)) reject('exportFilename is mandatory');
    else {
      wrpc(this, 'exportWalletKeys', opts, resolve, reject);
    }
  });
};

// Daemon RPC - JSON RPC

function drpc(that, method, params, resolve, reject) {
  request(that.daemonProtocol, that.daemonHost, that.daemonRpcPort, 'POST', that.timeout, buildRpc(method, params), that.daemonPath + '/json_rpc', null, null, resolve, reject);
}

CCX.prototype.count = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getblockcount', {}, resolve, reject);
  });
};

CCX.prototype.blockHashByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg);
    else drpc(this, 'on_getblockhash', [height], resolve, reject);
  });
};

CCX.prototype.blockHeaderByHash = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else drpc(this, 'getblockheaderbyhash', { hash: hash }, resolve, reject);
  });
};

CCX.prototype.blockHeaderByHeight = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg);
    else drpc(this, 'getblockheaderbyheight', { height: height }, resolve, reject);
  });
};

CCX.prototype.lastBlockHeader = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getlastblockheader', {}, resolve, reject);
  });
};

CCX.prototype.block = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else drpc(this, 'f_block_json', { hash: hash }, resolve, reject);
  });
};

CCX.prototype.blocks = function (height) {
  return new Promise((resolve, reject) => {
    if (!isNonNegative(height)) reject('height' + err.nonNeg);
    else drpc(this, 'f_blocks_list_json', { height: height }, resolve, reject);
  });
};

CCX.prototype.transaction = function (hash) {
  return new Promise((resolve, reject) => {
    if (!isHex64String(hash)) reject('hash' + err.hex64);
    else drpc(this, 'f_transaction_json', { hash: hash }, resolve, reject);
  });
};

CCX.prototype.transactionPool = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'f_on_transactions_pool_json', {}, resolve, reject);
  });
};

CCX.prototype.currencyId = function () {
  return new Promise((resolve, reject) => {
    drpc(this, 'getcurrencyid', {}, resolve, reject);
  });
};

CCX.prototype.blockTemplate = function (opts) {
  return new Promise((resolve, reject) => {
    if (!isObject(opts)) reject(err.opts);
    else if (!isAddress(opts.address)) reject('address' + err.addr);
    else if (!isNonNegative(opts.reserveSize) || opts.reserveSize > 255) reject('0 <= reserveSize <= 255');
    else drpc(this, 'getblocktemplate', { wallet_address: opts.address, reserve_size: opts.reserveSize }, resolve, reject);
  });
};

CCX.prototype.submitBlock = function (block) {
  return new Promise((resolve, reject) => {
    if (!isHexString(block)) reject('block' + err.hex);
    else drpc(this, 'submitblock', [block], resolve, reject);
  });
};

// Daemon RPC - JSON handlers

function hrpc(that, params, path, resolve, reject) {
  request(that.daemonProtocol, that.daemonHost, that.daemonRpcPort, 'GET', that.timeout, JSON.stringify(params), that.daemonPath + path, null, null, resolve, reject);
}

CCX.prototype.info = function () {
  return new Promise((resolve, reject) => {
    hrpc(this, {}, '/getinfo', resolve, reject);
  });
};

CCX.prototype.index = function () {
  return new Promise((resolve, reject) => {
    hrpc(this, {}, '/getheight', resolve, reject);
  });
};
/*
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
*/
CCX.prototype.transactions = function (txs) {
  return new Promise((resolve, reject) => {
    if (!arrayTest(txs, isHex64String)) reject('txs' + err.arr + ' of transactions each of which ' + err.hex64);
    else hrpc(this, { txs_hashes: txs }, '/gettransactions', resolve, reject);
  });
};

CCX.prototype.sendRawTransaction = function (rawTx) {
  return new Promise((resolve, reject) => {
    if (!isHexString(rawTx)) reject('rawTx' + err.hex);
    else hrpc(this, { tx_as_hex: rawTx }, '/sendrawtransaction', resolve, reject);
  });
};

// Utilities

function arrayTest(arr, test) {
  if (!Array.isArray(arr)) return false;
  let i;
  for (i = 0; i < arr.length; i++) { if (!test(arr[i])) break; }
  if (i < arr.length) return false;
  return true;
}

function isObject(obj) { return typeof obj === 'object'; }

function isUndefined(obj) { return typeof obj === 'undefined'; }

function isString(obj) { return typeof obj === 'string'; }

function isTransfer(obj) {
  if (!isObject(obj) || !isAddress(obj.address) || !isNonNegative(obj.amount)) return false;
  if (typeof obj.message !== 'undefined' && !isString(obj.message)) return false;
  return true;
}

function isNonNegative(n) { return (Number.isInteger(n) && n >= 0); }

function isNumeric(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

function isAddress(str) { return (typeof str === 'string' && str.length === 98 && str.slice(0, 3) === 'ccx'); }

function isIntAddress(str) { return (typeof str === 'string' && str.length === 186 && str.slice(0, 3) === 'ccx'); }

function isPrivateKey(str) { return (typeof str === 'string' && str.length === 64); }

function isHex64String(str) { return (typeof str === 'string' && /^[0-9a-fA-F]{64}$/.test(str)); }

function isHexString(str) { return (typeof str === 'string' && !/[^0-9a-fA-F]/.test(str)); }

function buildRpc(method, params) { return '{"jsonrpc":"2.0","id":"0","method":"' + method + '","params":' + JSON.stringify(params) + '}'; }

function request(protocol, host, port, method, timeout, post, path, user, pass, resolve, reject) {
  let obj = {
    hostname: host,
    port: port,
    method: method,
    timeout: timeout,
    path: path,
    headers: {      
      'Content-Type': 'application/json',
      'Content-Length': post.length,
    }
  };

  if (user && pass) {
    obj.headers["Authorization"] = `Basic ${Buffer.from(user + ':' + pass).toString('base64')}`;
  }

  var doRequest = protocol.request(
    obj,
    (res) => {
      if ((Math.floor(res.statusCode / 100) !== 2) && (Math.floor(res.statusCode / 100) !== 3)) {
        if (res.statusCode === 401) {
          reject('Authorization failed');
        } else {
          reject('RPC server error');
        }
      } else {
        let data = Buffer.alloc(0);
        res.on('data', (chunk) => { 
          data = Buffer.concat([data, chunk]); 
        });
        res.on('end', () => {
          try {
            data = JSON.parse(data.toString());
            if (data.error) { reject(data.error.message); return; }
          } catch (error) { reject(error.message); return; }
          if (data.result) data = data.result;
          resolve(data);
        });  
      }
    }
  );

  doRequest.on('error', (error) => {
    reject('RPC server error');
  });

  doRequest.on('timeout', () => {
    reject("RFC timeout");
    doRequest.abort();
  });

  doRequest.end(post);
}
