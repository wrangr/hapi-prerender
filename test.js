//
// Deps
//

var Zlib = require('zlib');
var Lab = require('lab');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Request = require('request');
var Nock = require('nock');


//
// Test shortcuts
//

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Lab.expect;


//
// The plugin module we will be tesing
//

var PrerenderPlugin = require('./');


//
// Helper to start a server with the plugin registered with teh given options.
//

function initServer(opt, done) {

  var options = Hoek.clone(opt);

  // Create new server.
  var server = new Hapi.Server(8888);

  server.pack.register({
    plugin: PrerenderPlugin,
    options: options
  }, function (err) {
    expect(err).to.not.exist;

    server.route({
      method: '*',
      path: '/',
      handler: function (request, reply) {
        reply('ok');
      }
    });

    server.route({
      method: 'GET',
      path: '/foo.css',
      handler: function (request, reply) {
        reply('body { color: pink; }');
      }
    });

    server.start(done);
  }); 

  return server;

}


//
// Tests
//

describe('hapi-prerender', function () {

  it('can be added as a plugin to hapi', function (done) {

    var server = new Hapi.Server();

    server.pack.register(PrerenderPlugin, function (err) {
      expect(err).to.not.exist;
      done();
    }); 

  });

  describe('with default options', function () {

    var server;

    before(function (done) {
      server = initServer({}, done);
    });

    after(function (done) {
      server.stop(done);
    });

    it('should return a prerendered response when known bot', function (done) {

      var scope = Nock('http://service.prerender.io')
        .get('/http://127.0.0.1:8888/foo?bar=true')
        .reply(301, '<html><body>prerendered!</body></html>', {
          'X-Prerender': 'foo'
        });

      Request({
        uri: 'http://127.0.0.1:8888/foo?bar=true',
        headers: { 'User-Agent': 'baiduspider' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(301);
        expect(resp.headers).to.exist;
        expect(resp.headers['x-prerender']).to.equal('foo');
        expect(resp.body).to.equal('<html><body>prerendered!</body></html>');
        done();
      });

    });

    it('should return prerendered response if _escaped_fragment_', function (done) {

      var scope = Nock('http://service.prerender.io')
        .get('/http://127.0.0.1:8888/?_escaped_fragment_=')
        .reply(301, '<html><body>prerendered!</body></html>', {
          'X-Prerender': 'foo'
        });

      Request({
        uri: 'http://127.0.0.1:8888/?_escaped_fragment_=',
        headers: { 'User-Agent': 'Not a known bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(301);
        expect(resp.headers).to.exist;
        expect(resp.headers['x-prerender']).to.equal('foo');
        expect(resp.body).to.equal('<html><body>prerendered!</body></html>');
        done();
      });

    });

    it('should ignore request if bad url with _escaped_fragment_', function (done) {

      Request({
        uri: 'http://127.0.0.1:8888/?query=params?_escaped_fragment_=',
        method: 'POST',
        headers: { 'User-Agent': 'not a bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(200);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('ok');
        done();
      });

    });

    it('should ignore request if its not a GET', function (done) {

      Request({
        uri: 'http://127.0.0.1:8888/?_escaped_fragment_=',
        method: 'POST',
        headers: { 'User-Agent': 'baiduspider' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(200);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('ok');
        done();
      });

    });

    it('should ignore request if user is not a bot', function (done) {

      Request({
        uri: 'http://127.0.0.1:8888/',
        headers: { 'User-Agent': 'not a bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(200);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('ok');
        done();
      });

    });

    it('should ignore if user is a bot, but is requesting a resource file', function (done) {

      Request({
        uri: 'http://127.0.0.1:8888/foo.css',
        headers: { 'User-Agent': 'baiduspider' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(200);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('body { color: pink; }');
        done();
      });

    });

    it('should return a prerendered gzipped response', function (done) {
    
      Zlib.gzip(new Buffer('<html></html>', 'utf-8'), function (err, zipped) {
        var scope = Nock('http://service.prerender.io')
          .get('/http://127.0.0.1:8888/foo')
          .reply(200, [ zipped ], { 'content-encoding': 'gzip' });

        Request({
          uri: 'http://127.0.0.1:8888/foo',
          headers: { 'User-Agent': 'baiduspider' }
        }, function (err, resp) {
          expect(err).to.not.exist;
          expect(resp.statusCode).to.equal(200);
          expect(resp.headers).to.exist;
          expect(resp.headers['content-encoding']).to.not.exist;
          expect(resp.body).to.equal('<html></html>');
          done();
        });
      });

    });

    it('should build the correct api url for the Cloudflare Flexible SSL support');

    it('should build the correct api url for the Heroku SSL Addon support with single value');

    it('should build the correct api url for the Heroku SSL Addon support with double value');

    it('should return a prerendered response if a string is returned from beforeRender');

  });

  describe('with token option', function () {

    var server;

    before(function (done) {
      server = initServer({ token: 'MY_TOKEN' }, done);
    });

    after(function (done) {
      server.stop(done);
    });

    it('should include X-Prerender-Token header in request', function (done) {
    
      var scope = Nock('http://service.prerender.io')
        .matchHeader('X-Prerender-Token', 'MY_TOKEN')
        .get('/http://127.0.0.1:8888/?_escaped_fragment_=')
        .reply(301, '<html><body>prerendered!</body></html>');

      Request({
        uri: 'http://127.0.0.1:8888/?_escaped_fragment_=',
        headers: { 'User-Agent': 'Not a known bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(301);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('<html><body>prerendered!</body></html>');
        done();
      });

    });

  });

  describe('with serviceUrl option', function () {

    var server;

    before(function (done) {
      server = initServer({ serviceUrl: 'http://127.0.0.1:3000/' }, done);
    });

    after(function (done) {
      server.stop(done);
    });

    it('should send request to custom service', function (done) {
    
      var scope = Nock('http://127.0.0.1:3000')
        .get('/http://127.0.0.1:8888/?_escaped_fragment_=')
        .reply(301, '<html><body>prerendered!</body></html>');

      Request({
        uri: 'http://127.0.0.1:8888/?_escaped_fragment_=',
        headers: { 'User-Agent': 'Not a known bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(301);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('<html><body>prerendered!</body></html>');
        done();
      });

    });

  });

  describe('with serviceUrl and token set via env', function () {

    var server;

    before(function (done) {
      process.env.PRERENDER_TOKEN = 'MY_TOKEN';
      process.env.PRERENDER_SERVICE_URL = 'http://foo';
      server = initServer({}, done);
    });

    after(function (done) {
      server.stop(done);
      delete process.env.PRERENDER_TOKEN;
      delete process.env.PRERENDER_SERVICE_URL;
    });

    it('should send request to given serviceUrl including token', function (done) {
    
      var scope = Nock('http://foo')
        .matchHeader('X-Prerender-Token', 'MY_TOKEN')
        .get('/http://127.0.0.1:8888/?_escaped_fragment_=')
        .reply(301, '<html><body>prerendered!</body></html>');

      Request({
        uri: 'http://127.0.0.1:8888/?_escaped_fragment_=',
        headers: { 'User-Agent': 'Not a known bot' }
      }, function (err, resp) {
        expect(err).to.not.exist;
        expect(resp.statusCode).to.equal(301);
        expect(resp.headers).to.exist;
        expect(resp.body).to.equal('<html><body>prerendered!</body></html>');
        done();
      });

    });

  });

  describe('with whitelist option', function () {
  
    it('should ignore if url is not whitelisted');

    it('should return a prerendered response if url is whitelisted');

  });

  describe('with blacklist option', function () {
  
    it('should ignore if the url is blacklisted');

    it('should return a prerendered response if url is not blacklisted');

    it('should ignore if the referer is blacklisted');

    it('should return a prerendered response if the referer is not blacklisted');

  });

});

