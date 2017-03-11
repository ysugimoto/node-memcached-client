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
});
