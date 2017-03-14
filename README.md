# node-memcached-client

Client library of Memcached for nodejs using ES6 promisified methods

[![Build Status](https://travis-ci.org/ysugimoto/node-memcached-client.svg?branch=master)](https://travis-ci.org/ysugimoto/node-memcached-client)
[![Coverage Status](https://coveralls.io/repos/github/ysugimoto/node-memcached-client/badge.svg)](https://coveralls.io/github/ysugimoto/node-memcached-client)
[![Code Climate](https://codeclimate.com/github/ysugimoto/node-memcached-client/badges/gpa.svg)](https://codeclimate.com/github/ysugimoto/node-memcached-client)

## Features

- Implemented ES6 features
- Any `store` and `get` operation returns `Promise`
- Auto reconnection if memcahed server is down unexpectedly
- Connection pooling per host, scaling

## Installation

```shell
$ npm install node-memcached-client
```

## Usage

Callback style connect:

```js
const Memcached = require('node-memcached-client');
const client = new Memcached({
  host: 'localhost',
  port: 11211
});

client.on('connect', () => {
  client.set('foo', 'bar', false, 100)
  .then(() => {
      return client.get('foo');
  })
  .then(foo => {
    console.log(foo); // bar
    client.close();
  });
});
client.connect();
```

Promise style connect:

```js
const Memcached = require('node-memcached-client');
const client = new Memcached({
  host: 'localhost',
  port: 11211
});

client.connect()
.then(c => {
  c.set('foo', 'bar', false, 100)
  .then(() => c.get('foo'))
  .then(foo => {
    console.log(foo); // bar
    c.close();
  });
});
```

## Client Options

|         name         |   type  | default value |            description            |
|:--------------------:|:-------:|:-------------:|:---------------------------------:|
|         host         |  string |  'localhost'  |    Memcached server to connect    |
|         port         |  Number |     11211     |     Memcached port to connect     |
|     autoreconnect    | Boolean |     false     |     Client tries to reconnect     |
|   reconnectDuration  |  Number |      2000     | Duration time of reconnect (msec) |
| maxRetryConnectCount |  Numer  |       10      |      Retry times to reconnect     |

## Connection Pooling Settings

Pooling configuration enable to change by environment variables:

|                  name                 |  type  | default value |                   description                   |
|:-------------------------------------:|:------:|:-------------:|:-----------------------------------------------:|
|     MEMCACHED_CLIENT_MAX_POOL_SIZE    | Number |       1       | Connection pooling size per host:port signature |
| MEMCACHED_CLIENT_SCALE_THRESHOLD_SIZE | Number |      100      |     Threshold to increase client connection     |


