//
// hapi plugin for [prerender](https://github.com/prerender/prerender).
// Loosely based on [prerender-node](https://github.com/prerender/prerender-node)
//

var Url = require('url');
var Zlib = require('zlib');
var Request = require('request');
var Hoek = require('hoek');

//
// Public API
//

exports.register = function (server, options, next) {

  var settings = Hoek.applyToDefaults({
    serviceUrl: process.env.PRERENDER_SERVICE_URL || 'http://service.prerender.io/',
    token: process.env.PRERENDER_TOKEN,
    protocol: false,
    beforeRender: function (req, done) { done(); },
    afterRender: function (req, resp) {}
  }, options);

  function buildApiUrl(req) {
    var prerenderUrl = settings.serviceUrl;
    var forwardSlash = prerenderUrl.indexOf('/', prerenderUrl.length - 1) !== -1 ? '' : '/';

    // Here we need to look at the request's protocol, not sure if this is
    // correct...
    var protocol = req.server.info.protocol;

    if (settings.protocol) {
      protocol = settings.protocol;
    }

    var fullUrl = protocol + "://" + req.headers.host + Url.format(req.url);

    // Allow for URL rewriting before requesting the prerendered version
    if (settings.rewriteUrl) {
      fullUrl = settings.rewriteUrl(fullUrl);
    }

    return prerenderUrl + forwardSlash + fullUrl;
  }

  function plainResponse(resp, cb) {
    var content = '';
    resp.on('data', function (chunk) {
      content += chunk;
    });
    resp.on('end', function () {
      resp.body = content;
      cb(null, resp);
    });
  }

  function gzipResponse(resp, cb) {
    var gunzip = Zlib.createGunzip();
    var content = '';

    gunzip.on('data', function (chunk) {
      content += chunk;
    });

    gunzip.on('end', function () {
      resp.body = content;
      delete resp.headers['content-encoding'];
      delete resp.headers['content-length'];
      cb(null, resp);
    });

    resp.pipe(gunzip);
  }

  function getPrerenderedPageResponse(req, cb) {
    var reqOptions = {
      uri: Url.parse(buildApiUrl(req)),
      followRedirect: false
    };

    if (settings.token) {
      reqOptions.headers = {
        'X-Prerender-Token': settings.token,
        'User-Agent': req.headers['user-agent'],
        'Accept-Encoding': 'gzip'
      };
    }

    Request(reqOptions)
      .on('error', function (err) {
        cb(err);
      })
      .on('response', function (resp) {
        var encoding = resp.headers['content-encoding'];
        if (encoding && encoding === 'gzip') {
          gzipResponse(resp, cb);
        } else {
          plainResponse(resp, cb);
        }
      });
  }

  server.ext('onRequest', function (req, reply) {
    if (!settings.shouldShowPrerenderedPage(req)) {
      return reply.continue();
    }

    function sendResponse(resp) {
      var r = reply(resp.body);
      r.code(resp.statusCode);
      Object.getOwnPropertyNames(resp.headers).forEach(function (k) {
        r.header(k, resp.headers[k]);
      });
    }

    settings.beforeRender(req, function (err, cached) {
      if (!err && cached && typeof cached.body === 'string') {
        return sendResponse(cached);
      }

      getPrerenderedPageResponse(req, function (err, resp) {
        if (err) {
          console.error('Error getting prerendered page.');
          console.error(err);
          console.error('Falling back to unrendered (normal) reponse...');
          return reply.continue();
        }

        var prerenderedResponse = {
          statusCode: resp.statusCode,
          headers: resp.headers,
          body: resp.body
        };

        settings.afterRender(req, prerenderedResponse);
        sendResponse(prerenderedResponse);
      });
    });
  });

  next();

};

exports.register.attributes = {
  pkg: require('./package.json')
};
