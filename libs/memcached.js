'use strict';

const EventEmitter = require('events').EventEmitter;
const Pool = require('./pool.js');
const Message = require('./message.js');
const Logger = require('./log.js');

const DEFAULT_OPTIONS = {
  host: 'localhost',
  port: 11211,
  autoreconnect: false,
  commandTimeout: 2000,
  reconnectDuration: 2000,
  maxRetryConnectCount: 10
};

/**
 * Memcached client
 *
 * Specs:
 *   - Manage connection pools
 *   - Support automatic reconnection
 *   - Command queueing, and run when reconnected
 *   - Non-exiting when connection closed unexpectedly
 *
 * Protocol specification
 * @see https://github.com/memcached/memcached/blob/master/doc/protocol.txt
 */
class Memcached extends EventEmitter {

  /**
   v Constructor
   * @param {Object} options - Connect options
   */
  constructor(options) {
    super();

    this.queue = [];
    this.conn = null;
    this.running = false;
    this.clientClosed = false;

    this.options = Object.assign(DEFAULT_OPTIONS, options || {});
  }

  /**
   * Validate key signature
   *
   * @param {String} key key name
   * @return {Void} -
   * @throws Error
   */
  validateKey(key) {
    if (key.length > 250) {
      throw new Error('Key size limit exceeded. Key size must be under the 250 bytes');
    }
    // Key string must not contain control characters and whitespece
    if (/[\u0000-\u001F|\u007f|\u0080-\u009f|\s]/.test(key)) {
      throw new Error('Invalid key. Key must not contain control characters and whitespace');
    }
  }

  /**
   * Connect to memcached server
   *
   * @return {Void} -
   */
  connect() {
    return new Promise(resolve => {
      const c = Pool.pull(this.options.host, this.options.port, this.options);
      this.conn = c.connection;

      if (c.created) {
        this.conn.on('mc.error', () => this.emit('mc.error'));
        this.conn.on('timeout', () => this.emit('timeout'));
        this.conn.on('connect', () => {
          this.emit('connect');
          resolve(this);
        });
        this.conn.on('close', () => this.emit('close'));
      } else {
        // We need to a bit delay to emit connect event if connection returns by pool
        setTimeout(() => {
          this.emit('connect');
          resolve(this);
        }, 10);
      }
    });
  }

  /**
   * Close connection from client
   *
   * @return {Void} -
   */
  close() {
    try {
      // Not that this closing connect is expected by user.
      // So we do not try to reconnect
      this.conn.close();
    } catch (e) {
      Logger.error(e);
    }
  }

  /**
   * Send "add" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   */
  add(key, value, isCompress = 0, expires = 0) {
    return this.store('add', key, value, isCompress, expires);
  }

  /**
   * Send "replace" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   */
  replace(key, value, isCompress = 0, expires = 0) {
    return this.store('replace', key, value, isCompress, expires);
  }

  /**
   * Send "append" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   */
  append(key, value, isCompress = 0, expires = 0) {
    return this.store('append', key, value, isCompress, expires);
  }

  /**
   * Send "prepend" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   */
  prepend(key, value, isCompress = 0, expires = 0) {
    return this.store('prepend', key, value, isCompress, expires);
  }

  /**
   * Send "set" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   */
  set(key, value, isCompress = 0, expires = 0) {
    return this.store('set', key, value, isCompress, expires);
  }

  /**
   * Create stored command and send, and handle reply
   *
   * @param {String} commandName command name
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @return {Promise} -
   * @resolve {Void}
   * @reject {Void}
   */
  store(commandName, key, value, isCompress, expires) {
    this.validateKey(key);
    const byteSize = (value instanceof Buffer) ? Buffer.length : Buffer.byteLength(value, 'utf8');
    const command = [
      `${commandName} ${key} ${isCompress ? 1 : 0} ${expires} ${byteSize}`,
      (value instanceof Buffer) ? value.toString('utf8') : value
    ];
    return this.conn.command(command)
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.EXISTS:
          case Message.STORED:
          case Message.NOT_STORED:
            return Promise.resolve(code);
          default:
            return Promise.reject(code);
        }
      })
    ;
  }

  /**
   * Send "cas" command
   *
   * @param {String} key cache key
   * @param {String|Buffer} value store value
   * @param {Booelan} isCompress flag of data should be compressed
   * @param {Number} expires time to cache has expired (if supplied zero, the value is persitent)
   * @param {String} unique cas unique
   * @return {Promise} -
   * @resolve {String} reply code
   * @reject {String} reply code
   */
  cas(key, value, isCompress = 0, expires = 0, unique = '') {
    this.validateKey(key);
    const byteSize = (value instanceof Buffer) ? Buffer.length : Buffer.byteLength(value, 'utf8');
    const command = [
      `cas ${key} ${isCompress ? 1 : 0} ${expires} ${byteSize} ${unique}`,
      (value instanceof Buffer) ? value.toString('utf8') : value
    ];
    return this.conn.command(command)
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.STORED:
            return Promise.resolve(code);
          default:
            return Promise.reject(code);
        }
      })
    ;
  }

  /**
   * Get cache data from supplied key
   *
   * @param {Array} keys cache key
   * @return {Promise} -
   * @resolve {String|null} cache data
   * @reject {Void}
   */
  get(...keys) {
    keys.forEach(k => this.validateKey(k));
    return this.conn.command([`get ${keys.join(' ')}`])
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.END:
            return Promise.resolve(null);
          case Message.ERROR:
          case Message.SERVER_ERROR:
          case Message.CLIENT_ERROR:
            return Promise.reject(code);
          default:
            if (keys.length === 1) {
              return Promise.resolve(message.getValue());
            }
            const values = message.getBulkValues();
            keys.forEach(k => {
              if (!values.hasOwnProperty(k)) {
                values[k] = null;
              }
            });
            return Promise.resolve(values);
        }
      })
    ;
  }

  /**
   * Get cache data from supplied key with cas unique
   *
   * @param {String} key cache key
   * @return {Promise} -
   * @resolve {Object|null} cache data map by key
   * @reject {Void}
   */
  gets(...keys) {
    keys.forEach(k => this.validateKey(k));
    return this.conn.command([`gets ${keys.join(' ')}`])
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.END:
            return Promise.resolve(null);
          case Message.ERROR:
          case Message.SERVER_ERROR:
          case Message.CLIENT_ERROR:
            return Promise.reject(code);
          default:
            if (keys.length === 1) {
              return Promise.resolve(message.getObjectValue());
            }
            const values = message.getBulkObjectValues();
            keys.forEach(k => {
              if (!values.hasOwnProperty(k)) {
                values[k] = null;
              }
            });
            return Promise.resolve(values);
        }
      })
    ;
  }

  /**
   * Delete cache data from supplied key
   *
   * @param {String} key cache key
   * @return {Promise} -
   * @resolve {Void}
   * @reject {Void}
   */
  delete(key) {
    this.validateKey(key);
    return this.conn.command([`delete ${key}`])
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.DELETED:
            return Promise.resolve(code);
          default:
            return Promise.reject(code);
        }
      })
    ;
  }

  /**
   * Increment data from supplied key
   *
   * @param {String} key cache key
   * @param {Number} value increment value
   * @return {Promise} -
   * @resolve {Number} Incremented value
   * @reject {Void}
   */
  incr(key, value = 1) {
    return this.incrOrDecr('incr', key, value);
  }

  /**
   * Decrement data from supplied key
   *
   * @param {String} key cache key
   * @param {Number} value decrement value
   * @return {Promise} -
   * @resolve {Number} Decremented value
   * @reject {Void}
   */
  decr(key, value = 1) {
    return this.incrOrDecr('decr', key, value);
  }

  /**
   * Send "incr" or "decr" command
   *
   * @param {String} commandName command name
   * @param {String} key cache key
   * @param {Number} value increment or decrement value
   * @return {Promise} -
   * @resolve {Number}
   * @reject {Void}
   */
  incrOrDecr(commandName, key, value) {
    this.validateKey(key);
    const command = [`${commandName} ${key} ${value}`];
    return this.conn.command(command)
      .then(message => {
        const result = parseInt(message.rawData, 10);
        if (!isNaN(result)) {
          return Promise.resolve(result);
        }
        return Promise.reject(message.code);
      })
    ;
  }

  /**
   * Update expired time for key
   *
   * @param {String} key cache key
   * @param {Number} expires update expired time
   * @return {Promise} -
   * @resolve {Void}
   * @reject {Void}
   */
  touch(key, expires) {
    this.validateKey(key);
    const command = [`touch ${key} ${expires}`];
    return this.conn.command(command)
      .then(message => {
        const code = message.code;
        switch (code) {
          case Message.TOUCHED:
            return Promise.resolve(code);
          default:
            return Promise.reject(code);
        }
      })
    ;
  }
}

module.exports = Memcached;

