'use strict';

const Connection = require('./connection.js');
const Logger = require('./log.js');

/**
 * Connection pool mamanger
 */
class ConnectionPool {

  /**
   * Constructor
   *
   * @param {Number} maxPoolSize max pool size per server
   * @param {Number} scaleThreshold threshold that scale out connection
   */
  constructor(maxPoolSize = 1, scaleThreshold = 100) {
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
   * Get pool connection or create a new connection
   *
   * @param {String} host server host
   * @param {Number} port server port
   * @param {Object} options connection options
   * @return {Object} conn info (from pool or created)
   */
  pull(host, port, options) {
    const key = `${host}:${port}`;
    const pool = this.pools[key] || (this.pools[key] = {});

    // Find least busy connection at this time
    const connections = Object.keys(pool)
      .map(k => pool[k])
      .sort((a, b) => a.queue.length > b.queue.length ? 1 : -1);

    // If there isn't connection in pool, create new connection
    if (connections.length === 0) {
        const conn = this.createConnection(options);
        Logger.info(`No connections exist to ${key}, created sid:${conn.sid}`);
        conn.on('destroy', () => this.destroy(host, port, conn));
        this.pools[key][conn.sid] = conn;
        return {connection: conn, created: true};
    }
    // If connection has too many queued items, try to create a new connection
    if (connections[0].queue.length > options.scaleThreshold) {
      if (sid.length <= this.maxPoolSize) {
        const conn = this.createConnection(options);
        Logger.info(`Create new connection to scale out sid:${conn.sid}`);
        conn.on('destroy', () => this.destroy(host, port, conn));
        this.pools[key][conn.sid] = conn;
        return {connection: conn, created: true};
      }
    }

    // Use pooling connection
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
    if (!this.pools.hasOwnProperty(key) || !(conn instanceof Connection)) {
      return;
    }
    const pool = this.pools[key];
    const sid = conn.sid;
    conn = null;
    delete pool[sid];
    Logger.info(`Destroyed connection, sid: ${sid}`);
  }
}

module.exports = new ConnectionPool(
  process.env.MEMCACHED_CLIENT_MAX_POOL_SIZE || 1,
  process.env.MEMCACHED_CLIENT_SCALE_THRESHOLD_SIZE || 100
);
