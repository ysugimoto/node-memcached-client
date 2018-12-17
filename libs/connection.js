'use strict';

const net = require('net');
const EventEmitter = require('events').EventEmitter;
const Message = require('./message.js');
const Logger = require('./log.js');

/**
 * Memcached connection wrapper
 */
class Connection extends EventEmitter {

  /**
   * Constructor
   *
   * @param {Number} sid identified server number
   * @param {Object} options connection options
   */
  constructor(sid, options) {
    super();

    this.sid = sid;
    this.signature = `${options.host}:${options.port}:${sid}`;
    this.options = options;
    this.socket = null;
    this.retryCount = 0;
    this.firstConnect = true;
    this.clientClosed = false;
    this.timer = null;
    this.queue = [];
    this.running = false;
  }

  /**
   * Connect to server
   *
   * @return {Void} -
   */
  connect() {
    this.socket = net.connect({
      host: this.options.host,
      port: this.options.port
    });

    // Do not emit "error" event because process exitted if error did not handle at client
    // So we emit "mc.error" instead.
    this.socket.on('error', () => this.emit(`mc.error`));
    this.socket.on('timeout', () => this.emit(`timeout`));
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('close', () => this.handleClose());
  }

  /**
   * Close connection manually
   *
   * @return {Void} -
   */
  close() {
    this.clientClosed = true;
    if (this.socket) {
      this.socket.end();
      this.socket = null;
      this.emit('destroy');
    }
  }

  /**
   * Handle "connect" event from socket
   *
   * @return {Void} -
   */
  handleConnect() {
    this.retryCount = 0;
    // We socketect on first time!
    if (this.firstConnect) {
      Logger.info('Client connected');
      this.emit(`connect`, this.socket);
      this.firstConnect = false;
    } else {
      // At the second time or other, emit 'reconnect' event
      Logger.info('Client reconnected');
      this.emit(`reconnect`);
    }
    // Support async command running. If command enqueued before connection to server, run and flush it
    this.run();
  }

  /**
   * Handle "close" event from socket
   *
   * @return {Void} -
   */
  handleClose() {
    this.emit(`close`);

    // If socketection closed due to unexpected reason, retry to socketect server
    if (!this.clientClosed) {
      this.retry();
    }
  }

  /**
   * Retry to socketect memcached server
   *
   * @return {Void} -
   */
  retry() {
    if (!this.options.autoreconnect) {
      return;
    }

    this.retryCount++;
    if (this.options.maxRetryConnectCount > 0 && this.options.maxRetryConnectCount <= this.retryCount) {
      this.emit('mc.error', 'Client gave up reconnect to server');
      this.close();
      return;
    }
    Logger.warn(`Cannot connected to memcached server. Try to reconnecting...`);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), this.options.reconnectDuration);
  }

  /**
   * Enqueue command
   *
   * @param {Function} queue send command queue
   * @return {Void} -
   */
  enqueue(queue) {
    this.queue.push(queue);

    // If connection has already established, run it
    if (!this.running) {
      this.run();
    }
  }

  /**
   * Run queues
   *
   * @return {Void} -
   */
  run() {
    if (this.queue.length === 0 || !this.socket) {
      this.running = false;
      return;
    }
    this.running = true;
    this.queue.shift()();
  }

  /**
   * Command timeout handler
   *
   * @return {Void} -
   */
  timeout() {
    this.emit('timeout');
    this.socket.destroy(new Error('Command timeout'));
  }

  /**
   * Send commands to socket
   *
   * @param {Array} commands commands to send
   * @return {Promise} -
   */
  command(commands) {
    return new Promise((resolve, reject) => {
      this.enqueue(() => {
        const isNumberReply = /^(incr|decr)/.test(commands[0]);
        // Server responds chunked reply due to cached data is too huge.
        // So we factory chunked buffer and concat these
        const message = new Message();
        const readReply = chunk => {
          message.append(chunk);
          if (Message.isEOF(chunk, isNumberReply)) {
            clearTimeout(timer);
            this.socket.removeListener('data', readReply);
            resolve(message.freeze());
            this.run();
          }
        };
        this.socket.on('data', readReply);

        // Send each command suffixed by CRLF
        commands.forEach(cmd => {
          this.socket.write(Buffer.from(cmd.toString(), 'utf8'));
          this.socket.write('\r\n');
        });

        // Set command timeout queue
        const timer = setTimeout(() => {
          this.timeout();
          reject(new Error('Command timeout'));
        }, this.options.commandTimeout);
      });
    });
  }
}

module.exports = Connection;
