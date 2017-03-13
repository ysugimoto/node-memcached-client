'use strict';

const Memcached = require('../libs/memcached.js');

const client = new Memcached({
  host: 'localhost',
  port: 11211
});

const key = 'example';
const dat = "𠮷野屋で𩸽\r\n頼んで𠮟られる😭";

client.on('close', () => console.log('Client closed'));
client.on('reconnect', () => console.log('Cliend reconnected'));
client.on('connect' => {
  client.set(key, dat, 0, 100)
  .then(() => {
    console.log(`Saved for key: ${key}`);
    return client.get('example');
  })
  .then((data) => {
    console.log(`Data received for ${key}: ${data}`);
    client.close();
  });
});
client.connect();
