'use strict';

const RED = '\u001b[31m';
const GREEN = '\u001b[32m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

const PREFIX = '[Memcached]';

/**
 * Write to console with some colors
 *
 * @param {String} msg message
 * @param {String} type log type
 * @param {String} color color name
 * @return {Void} -
 */
const write = (msg, type = '', color = '') => {
  const t = type === '' ? '' : `${type}:`;
  const tail = color === '' ? '' : RESET;
  console.log(`${color}${PREFIX} ${t} ${msg}${tail}`);
};

module.exports = {
  log: msg => write(msg),
  info: msg => write(msg, 'INFO', GREEN),
  warn: msg => write(msg, 'WARN', YELLOW),
  error: msg => write(msg, 'ERROR', RED)
};
