//
// Deps
//

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

    it('should return a prerendered response when known bot', {
      timeout: 5000
    }, function (done) {

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

  });

  describe('with prerender.io token', function () {
  });

  describe('with custom service url', function () {
  });


  /*
  it('should return a prerendered gzipped response');

  it('should call next() if the url is a bad url with _escaped_fragment_');

  it('should call next() if the url is not part of the regex specific whitelist');

  it('should return a prerendered response if the url is part of the regex specific whitelist');

  it('should call next() if the url is part of the regex specific blacklist');

  it('should return a prerendered response if the url is not part of the regex specific blacklist');

  it('should call next() if the referer is part of the regex specific blacklist');

  it('should return a prerendered response if the referer is not part of the regex specific blacklist');

  it('should return a prerendered response if a string is returned from beforeRender');

  it('whitelisted should return the prerendered middleware function');

  it('blacklisted should return the prerendered middleware function');

  describe('#buildApiUrl', function () {

    it('should build the correct api url with the default url');
    it('should build the correct api url with an environment variable url');
    it('should build the correct api url with an initialization variable url');
    it('should build the correct api url for the Cloudflare Flexible SSL support');
    it('should build the correct api url for the Heroku SSL Addon support with single value');
    it('should build the correct api url for the Heroku SSL Addon support with double value');

  });
  */

});

