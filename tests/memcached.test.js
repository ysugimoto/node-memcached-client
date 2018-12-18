'use strict';

const Memcached = require('../libs/memcached.js');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Memcached Class', () => {
  let client;
  before((done) => {
    client = new Memcached();
    client.on('connect', () => done());
    client.connect();
  });
  after(() => {
    client.close();
  });

  describe('#validateKey', () => {
    it('should throw error when key length over 250 bytes', () => {
      const fn = () => {
        const k = 'a'.repeat(256);
        client.validateKey(k);
      };
      expect(fn).to.throw(/limit exceeded/);
    });
    it('should throw error when key included white space', () => {
      const fn = () => {
        const k = 'Lorem Ipsum';
        client.validateKey(k);
      };
      expect(fn).to.throw(/Invalid key/);
    });
    it('should not throw error when key is valid', () => {
      const fn = () => {
        const k = 'test.some_case_000001';
        client.validateKey(k);
      };
      expect(fn).to.not.throw(/Invalid key/);
    });
  });

  describe('#add', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem');
    });

    afterEach(() => {
      return client.delete(a);
    });

    it('should be stored if key does not exists', () => {
      return client.add(b, 'lorem ipsum')
        .then(code => {
          return expect(code).to.equal('STORED');
        });
    });

    it('should not be stored if key exists', () => {
      return client.add(a, 'lorem ipsum')
        .then(code => {
          return expect(code).to.equal('NOT_STORED');
        })
        .catch(code => {
          console.log(code);
        });
    });
  });

  describe('#replace', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem');
    });

    afterEach(() => {
      return client.delete(a);
    });

    it('should be replaced if key exists', () => {
      return client.replace(a, 'lorem ipsum')
        .then(code => expect(code).to.equal('STORED'))
        .then(() => client.get(a))
        .then(value => expect(value).to.equal('lorem ipsum'));
    });

    it('should not be replaced if key does not exists', () => {
      return client.replace(b, 'lorem ipsum')
        .then(code => expect(code).to.equal('NOT_STORED'));
    });
  });

  describe('#append', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem');
    });

    afterEach(() => {
      return client.delete(a);
    });

    it('should be appended value if key exists', () => {
      return client.append(a, 'ipsum')
        .then(code => expect(code).to.equal('STORED'))
        .then(() => client.get(a))
        .then(value => expect(value).to.equal('loremipsum'));
    });

    it('should not be appended if key does not exists', () => {
      return client.append(b, 'lorem ipsum')
        .then(code => expect(code).to.equal('NOT_STORED'));
    });
  });

  describe('#prepend', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem');
    });

    afterEach(() => {
      return client.delete(a);
    });

    it('should be prepended if key exists', () => {
      return client.prepend(a, 'ipsum')
        .then(code => expect(code).to.equal('STORED'))
        .then(() => client.get(a))
        .then(value => expect(value).to.equal('ipsumlorem'));
    });

    it('should not be prepended if key does not exists', () => {
      return client.prepend(b, 'lorem ipsum')
        .then(code => expect(code).to.equal('NOT_STORED'));
    });
  });

  describe('#set', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;

    it('should be set value', () => {
      return client.set(a, 'lorem ipsum')
        .then(code => expect(code).to.equal('STORED'));
    });
  });

  describe('#set with buffer', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;

    it('should set value', () => {
      const value = Buffer.from('lorem ipsum');
      return client.set(a, value)
        .then(code => expect(code).to.equal('STORED'));
    });
  });

  describe('#cas', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const dat = 'cas data';

    beforeEach(() => {
      return client.set(a, dat);
    });

    it('should update value if cas unique matched', () => {
      return client.gets(a)
        .then(code => {
          const cas = code.cas;
          return client.cas(a, 'cas data updated', 0, 100, cas);
        })
        .then(code => expect(code).to.equal('STORED'));
    });
    it('should not update value if cas unique does not matched', () => {
      return client.gets(a)
        .then(code => {
          return client.cas(a, 'cas data updated', 0, 100, '9999');
        })
        .catch(code => expect(code).to.equal('EXISTS'));
    });
  });

  describe('#get', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const dat = "𠮷野屋で𩸽\r\n頼んで𠮟られる😭";

    beforeEach(() => {
      return client.set(a, dat);
    });

    it('should be retuns null if key does not exists', () => {
      return client.get('foobarbaz')
        .then(value => expect(value).to.be.null);
    });

    it('should be get value even if contains surrogate pair', () => {
      return client.get(a)
        .then(value => expect(value).to.equal(dat));
    });
  });

  describe('#gets', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;
    const dat01 = "1𠮷野屋で𩸽\r\n頼んで𠮟られる😭";
    const dat02 = "2𠮷野屋で𩸽\r\n頼んで𠮟られる😭";

    beforeEach(() => {
      return client.set(a, dat01)
        .then(() => client.set(b, dat02));
    });

    it('should be bulk get value even if contains surrogate pair', () => {
      return client.gets(a, b)
        .then(value => {
          expect(value).to.have.keys([a, b]);
          expect(value[a].value).to.equal(dat01);
          expect(value[b].value).to.equal(dat02);
        });
    });
  });

  describe('#delete', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const b = `b_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem')
    });

    it('should be deleted if key exists', () => {
      return client.delete(a)
        .then(code => expect(code).to.equal('DELETED'));
    });

    it('should not be deleted if key doesn not exists', () => {
      return client.delete(b)
        .catch(code => expect(code).to.equal('NOT_FOUND'));
    });
  });

  describe('#incr', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;

    beforeEach(() => {
      return client.set(a, 1)
    });

    it('should be incremented if key exists', () => {
      return client.incr(a, 4)
        .then(ret => expect(ret).to.equal(5));
    });
  });

  describe('#decr', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;

    beforeEach(() => {
      return client.set(a, 9)
    });

    it('should be decremented if key exists', () => {
      return client.decr(a, 4)
        .then(ret => expect(ret).to.equal(5));
    });
  });

  describe('#touch', () => {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;

    beforeEach(() => {
      return client.set(a, 'lorem')
    });

    it('should be touched if key exists', () => {
      return client.touch(a, 990)
        .then(code => expect(code).to.equal('TOUCHED'));
    });
  });

  describe('concurrency', () => {
    const keys = [];

    before(() => {
      const times = process.env.TRAVIS_TESTING ? 100 : 10000;
      for (let i = 0; i < times; i++) {
        const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
        client.set(rand, rand);
        keys.push(rand);
      }
    });

    it('get', () => {
      return Promise.all(keys.map(k => {
        return client.get(k)
          .then(msg => expect(msg).to.equal(k.toString()))
          .catch(e => {
            throw new Error(e);
          });
      }));
    });
  });

  describe('huge data', () => {
    const data = 'a'.repeat(1e5);
    const keys = [];

    before(() => {
      const times = process.env.TRAVIS_TESTING ? 5 : 100;
      for (let i = 0; i < 100; i++) {
        const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
        client.set(rand, data);
        keys.push(rand);
      }
    });

    it('get', () => {
      return Promise.all(keys.map(k => {
        return client.get(k)
          .then(msg => expect(msg).to.equal(data))
          .catch(e => {
            throw new Error(e);
          });
      }));
    });
  });

});


describe('Memcached (timeouts)', function() {
  let client;

  before(() => {
    client = new Memcached({ commandTimeout: 1 });
    return client.connect();
  });

  after(() => {
    return client.close();
  });

  describe('command timeout', function() {
    const rand = Math.floor(Math.random() * (1e10 - 1) + 1);
    const a = `a_${rand}`;
    const data = 'a'.repeat(1e8);

    it('should reject the promise', function() {
      return expect(client.set(a, data)).to.be.rejected;
    });
  });
});
