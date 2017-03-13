# node-memcached-client

Client library of Memcached for nodejs using ES6 promisified methods

## Features

- Implemented ES6 features
- Any `store` and `get` operation returns `Promise`
- Auto reconnection if memcahed server is down unexpectedly
- Connection pooling per host, scaling

## Installation

```
$ npm install node-memcached-client
```

## Usage

```
const Memcached = require('node-memcached-client');
const client = new Memcached({
  host: 'localhost',
  port: 11211
});

client.connect()
.then(conn  => {
  conn.set('foo', 'bar', false, 100)
  .then(() => {
      return client.get('foo');
  })
  .then(foo => {
    console.log(foo); // bar
    client.close();
  });
});
```

### Client Options

|         name         |   type  | default value |            description            |
|:--------------------:|:-------:|:-------------:|:---------------------------------:|
|         host         |  string |  'localhost'  |    Memcached server to connect    |
|         port         |  Number |     11211     |     Memcached port to connect     |
|     autoreconnect    | Boolean |     false     |     Client tries to reconnect     |
|   reconnectDuration  |  Number |      2000     | Duration time of reconnect (msec) |
| maxRetryConnectCount |  Numer  |       10      |      Retry times to reconnect     |


