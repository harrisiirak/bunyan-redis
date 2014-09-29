'use strict';

var redis = require('redis-mock');
var bunyan = require('bunyan');
var demand = require('must');
var RedisTransport = require('../');

describe('Bunyan redis transport', function () {
  var logger = null;
  var client = null;
  var transport = null;

  it('should create log entry with client', function (done) {
    client = redis.createClient(process.env.REDIS_PORT || 6379, process.env.REDIS_HOST || '127.0.0.1');
    client.select(0);

    transport = new RedisTransport({
      container: 'logs',
      client: client
    });

    logger = bunyan.createLogger({
      name: 'bunyan-redis',
      streams: [{
        type: 'raw',
        level: 'trace',
        stream: transport
      }]
    });

    logger.info('test');

    transport.on('error', function (err) {
      throw err;
    });

    transport.on('logged', function (entry) {
      demand(entry.msg).eql('test');
      demand(entry.level).eql(30);

      return done();
    });
  });

  it('should create log entry without client', function (done) {
    transport = new RedisTransport({
      container: 'logs',
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      db: 0
    });

    logger = bunyan.createLogger({
      name: 'bunyan-redis',
      streams: [{
        type: 'raw',
        level: 'trace',
        stream: transport
      }]
    });

    logger.debug({ val: 1 }, 'test');

    transport.on('error', function (err) {
      throw err;
    });

    transport.once('logged', function (entry) {
      demand(entry.msg).eql('test');
      demand(entry.level).eql(20);
      demand(entry).own('val');
      demand(entry.val).eql(1);

      return done();
    });
  });

  it('should successfully serialize circular dependencies', function (done) {
    var circularObj = {};
    circularObj.circularRef = circularObj;

    logger.debug(circularObj);

    transport.once('logged', function (entry) {
      demand(entry.circularRef).eql(entry.circularRef.circularRef);

      return done();
    });
  });
});
