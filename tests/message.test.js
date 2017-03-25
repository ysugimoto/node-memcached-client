'use strict';

const Message = require('../libs/message.js');
const expect = require('chai').expect;

describe('Message Class', () => {
  let m;
  beforeEach(() => {
    m = new Message();
  });

  describe('#append', () => {
    it('should be increased buffer stack', () => {
      m.append(Buffer.from('a', 'utf8'));
      m.append(Buffer.from('a', 'utf8'));

      expect(m.buffers).to.have.length(2);
      expect(m.size).to.equal(2);
    });
    it('should not be increased buffer stack after freezed', () => {
      m.append(Buffer.from('a', 'utf8'));
      m.freeze();
      m.append(Buffer.from('a', 'utf8'));

      expect(m.buffers).to.have.length(1);
      expect(m.size).to.equal(1);
    });
  });

  describe('#isEOF', () => {
    it('should be return true it message was "STORED"', () => {
      const reply = Buffer.from('STORED\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "ERROR"', () => {
      const reply = Buffer.from('ERROR\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "SERVER_ERROR"', () => {
      const reply = Buffer.from('SERVER_ERROR\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "CLIENT_ERROR"', () => {
      const reply = Buffer.from('CLIENT_ERROR\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "EXISTS"', () => {
      const reply = Buffer.from('EXISTS\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "TOUCHED"', () => {
      const reply = Buffer.from('TOUCHED\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "DELETED"', () => {
      const reply = Buffer.from('DELETED\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return true it message was "END"', () => {
      const reply = Buffer.from('END\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.true;
    });
    it('should be return false it message was value messages', () => {
      const reply = Buffer.from('VALUE foo 0 3 100\r\n', 'utf8');
      // eslint-disable-next-line no-unused-expressions
      expect(Message.isEOF(reply)).to.be.false;
    });
  });

  describe('#code', () => {
    beforeEach(() => {
      m.append(Buffer.from('STORED\r\n', 'utf8'));
      m.freeze();
    });

    it('should return trimmed code string', () => {
      expect(m.code).to.equal('STORED');
    });
  });

  describe('#rawData', () => {
    beforeEach(() => {
      m.append(Buffer.from('VALUE foo 0 3 100\r\nbar\r\nEND\r\n', 'utf8'));
      m.freeze();
    });

    it('should return trimmed raw string', () => {
      expect(m.rawData).to.equal('VALUE foo 0 3 100\r\nbar\r\nEND');
    });
  });

  describe('#getValue', () => {
    beforeEach(() => {
      m.append(Buffer.from('VALUE foo 0 3 100\r\nbar\r\nEND\r\n', 'utf8'));
      m.freeze();
    });

    it('should return expected value', () => {
      expect(m.getValue()).to.equal('bar');
    });
  });

  describe('#getBulkValues', () => {
    beforeEach(() => {
      m.append(Buffer.from('VALUE foo 0 3 100\r\nbar\r\n', 'utf8'));
      m.append(Buffer.from('VALUE lorem 0 5 100\r\nipsum\r\nEND\r\n', 'utf8'));
      m.freeze();
    });

    it('should return parsed bulk value as object', () => {
      const values = m.getBulkValues();
      expect(values).have.keys(['foo', 'lorem']);
      expect(values.foo).to.equal('bar');
      expect(values.lorem).to.equal('ipsum');
    });
  });

  describe('#getObjectValue', () => {
    beforeEach(() => {
      m.append(Buffer.from('VALUE foo 0 3 100\r\nbar\r\nEND\r\n', 'utf8'));
      m.freeze();
    });

    it('should return Object that has expected keys', () => {
      const value = m.getObjectValue();
      expect(value).have.keys(['key', 'flags', 'value', 'bytes', 'cas']);
      expect(value.cas).to.equal('100');
      expect(value.value).to.equal('bar');
    });
  });

  describe('#getBulkObjectValues', () => {
    beforeEach(() => {
      m.append(Buffer.from('VALUE foo 0 3 100\r\nbar\r\n', 'utf8'));
      m.append(Buffer.from('VALUE lorem 0 5 200\r\nipsum\r\nEND\r\n', 'utf8'));
      m.freeze();
    });

    it('should return parsed bulk value as object', () => {
      const values = m.getBulkObjectValues();
      expect(values).have.keys(['foo', 'lorem']);
      expect(values.foo).have.keys(['key', 'flags', 'value', 'bytes', 'cas']);
      expect(values.foo.value).to.equal('bar');
      expect(values.lorem).have.keys(['key', 'flags', 'value', 'bytes', 'cas']);
      expect(values.lorem.value).to.equal('ipsum');
    });
  });
});
