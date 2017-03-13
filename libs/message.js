'use strict';

const CRLF = '\r\n';
const CRLF_LENGTH = CRLF.length;
const CRLF_TAIL = new RegExp('\r\n$');

/**
 * Socket reply message wrapper
 */
class Message {

  /**
   * Constructor
   */
  constructor() {
    this.buffers = [];
    this.size = 0;

    this._message = null;
  }

  /**
   * Append to stack buffer
   *
   * @param {Buffer} chunk append chunk buffer
   * @return {Void} -
   */
  append(chunk) {
    if (this._message) {
      return;
    }
    this.buffers.push(chunk);
    this.size += chunk.length;
  }

  /**
   * Freeze message
   * After call, message buffer cannot modify any more.
   *
   * @return {Message} this
   */
  freeze() {
    if (this._message) {
      return;
    }
    this._message = Buffer.concat(this.buffers, this.size);
    return this;
  }

  /**
   * Check message buffer is EOF
   *
   * @static
   * @param {Buffer} buffer chunk buffer
   * @param {Boolean} isNumberReply expected number reply
   * @return {Boolean} -
   */
  static isEOF(buffer, isNumberReply = false) {
    // Special case of incr / decr reply
    if (isNumberReply && /^[0-9]+\r\n/.test(buffer.toString('utf8'))) {
      return true;
    }

    const EOFMessagList = [
      Message.STORED,
      Message.NOT_STORED,
      Message.NOT_FOUND,
      Message.ERROR,
      Message.EXISTS,
      Message.TOUCHED,
      Message.DELETED,
      Message.END
    ];

    return EOFMessagList.some(msg => {
      const index = buffer.indexOf(msg);
      return (index !== -1 && index + msg.length + CRLF_LENGTH === buffer.length);
    });
  }

  /**
   * Try to single reply code
   *
   * @return {String} code reply code
   */
  get code() {
    if (!this._message) {
      return '';
    }

    // If reply message is too huge, to stringify all buffer takes high cost.
    // So we check some length from top of message (about 14 bytes is enough)
    const buffer = this.buffer;
    const end = Math.min(buffer.length, 14);
    const code = Buffer.alloc(end);
    buffer.copy(code, 0, 0, end);

    return code.toString('utf8').replace(CRLF_TAIL, '');
  }

  /**
   * Get raw data to string
   *
   * @return {String} -
   */
  get rawData() {
    if (!this._message) {
      return '';
    }
    return this._message.toString('utf8').replace(CRLF_TAIL, '');
  }

  /**
   * Buffer getter
   *
   * @return {Buffer} -
   */
  get buffer() {
    return this._message;
  }

  /**
   * Get parsed value from "get" command response
   *
   * @return {String} -
   */
  getValue() {
    const buffer = this.buffer;
    let start = buffer.indexOf(CRLF);
    const meta = buffer.slice(0, start).toString('utf8').split(' ');
    start += CRLF_LENGTH;
    const value = buffer.slice(start, start + parseInt(meta[3], 10));

    return value.toString('utf8');
  }

  /**
   * Get parsed multiple-value from "gets" command response
   *
   * @return {String} -
   */
  getBulkValues() {
    const values = {};
    const buffer = this.buffer;
    let index = 0;

    do {
      const delim = buffer.indexOf(CRLF, index);
      const meta = buffer.slice(index, delim).toString('utf8').split(' ');
      if (meta[0] === Message.END) {
        break;
      }
      index = delim + CRLF_LENGTH;
      const dataSize = parseInt(meta[3], 10);
      values[meta[1]] = buffer.slice(index, index + dataSize).toString('utf8');
      index += dataSize + CRLF_LENGTH;
    } while(true);

    return values;
  }

}

Message.STORED = 'STORED';
Message.NOT_STORED = 'NOT_STORED';
Message.NOT_FOUND = 'NOT_FOUND';
Message.EXISTS = 'EXISTS';
Message.END = 'END';
Message.DELETED = 'DELETED';
Message.TOUCHED = 'TOUCHED';
Message.ERROR = 'ERROR';
Message.CLIENT_ERROR = 'CLIENT_ERROR';
Message.SERVER_ERROR = 'SERVER_ERROR';

module.exports = Message;
