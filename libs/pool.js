'use strict';

const EventEmitter = require('events').EventEmitter;
const Connection = require('./connection.js');
const Logger = require('./log.js');

/**
 * Connection pool mamanger
 */
class ConnectionPool extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Number} maxPoolSize max pool size per server
   * @param {Number} scaleThreshold threshold that scale out connection
   */
  constructor(maxPoolSize = 1, scaleThreshold = 100) {
    super();

    this.maxPoolSize = maxPoolSize;
    this.scaleThreshold = scaleThreshold;
    this.pools = {};
    this.sid = 0;
  }

  createConnection(options) {
    const conn = new Connection(++this.sid, options);
    conn.connect();
    return conn;
  }

  /**
   * Get pool connection or create new
   *
   * @param {String} host server host
   * @param {Number} port server port
   * @param {Object} options connection options
   * @return {Object} conn info (from pool or created)
   */
  pull(host, port, options) {
    const key = `${host}:${port}`;
    const pool = this.pools[key] || (this.pools[key] = {});

    // Find most leisure connection at this time
    const connections = Object.keys(pool)
      .map(k => pool[k])
      .sort((a, b) => a.queue.length > b.queue.length ? 1 : -1);

    // If there isn't connection in pool, create new connection
    if (connections.length === 0) {
        const conn = this.createConnection(options);
        Logger.info(`Nothing any connection to ${key}, created sid:${conn.sid}`);
        this.pools[key][conn.sid] = conn;
        return {connection: conn, created: true};
    }
    // If connection have queue stack over threshold, try to create new connection
    if (connections[0].queue.length > options.scaleThreshold) {
      if (sid.length <= this.maxPoolSize) {
        const conn = this.createConnection(options);
        Logger.info(`Create new connection to scale out sid:${conn.sid}`);
        this.pools[key][conn.sid] = conn;
        return {connection: conn, created: true};
      }
    }

    Logger.info(`Returns pool connection, sid: ${connections[0].sid}`);
    return {connection: connections[0], created: false};
  }

  /**
   * Destroy connection from pool
   *
   * @param {String} host server host
   * @param {Number} port server port
   * @param {Connection} conn destroyed connection
   * @return {Void} -
   */
  destroy(host, port, conn) {
    const key = `${host}:${port}`;
    if (!this.pool.hasOwnProperty(key) || !(conn instanceof Connection)) {
      return;
    }
    const pool = this.pool[key];
    const sid = conn.sid;
    conn.close();
    conn = null;
    delete pool[sid];
    Logger.info(`Destroyed connection, sid: ${sid}`);
  }
}

module.exports = new ConnectionPool(
  process.env.MEMCACHED_MAX_POOL_SIZE || 1,
  process.env.MEMCACHED_SCALE_THRESHOLD_SIZE || 100
);
