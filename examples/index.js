'use strict';

const Memcached = require('./lib/memcached.js');

const client = new Memcached({
  host: 'localhost',
  port: 11211,
  autoreconnect: true
});
const str = "𠮷野屋で𩸽\r\n頼んで𠮟られる😭";
client.connect();
// client.on('close', () => console.log('client close'));
client.on('reconnect', () => console.log('client reconnected'));
client.on('connect', () => {
  client.set('foo', `1${str}`, 0, 100)
  .then(() => client.set('bar', `2${str}`, 0, 100))
  .then(() => client.gets('foo', 'bar'))
  .then((data) => console.log(data));
});
