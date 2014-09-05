//
// hapi plugin for [prerender](https://github.com/prerender/prerender).
// Loosely based on [prerender-node](https://github.com/prerender/prerender-node)
//

var Url = require('url');
var Zlib = require('zlib');
var Request = require('request');
var Hoek = require('hoek');

// Declare internals
var internals = {};

// googlebot, yahoo, and bingbot are not in this list because
// we support _escaped_fragment_ and want to ensure people aren't
// penalized for cloaking.
internals.crawlerUserAgents = [
  // 'googlebot',
  // 'yahoo',
  // 'bingbot',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'developers.google.com/+/web/snippet'
];

internals.extensionsToIgnore = [
  '.js',
  '.css',
  '.xml',
  '.less',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.pdf',
  '.doc',
  '.txt',
  '.ico',
  '.rss',
  '.zip',
  '.mp3',
  '.rar',
  '.exe',
  '.wmv',
  '.doc',
  '.avi',
  '.ppt',
  '.mpg',
  '.mpeg',
  '.tif',
  '.wav',
  '.mov',
  '.psd',
  '.ai',
  '.xls',
  '.mp4',
  '.m4a',
  '.swf',
  '.dat',
  '.dmg',
  '.iso',
  '.flv',
  '.m4v',
  '.torrent'
];

internals.shouldShowPrerenderedPage = function (req) {
  var userAgent = req.headers['user-agent'];
  var bufferAgent = req.headers['x-bufferbot'];
  var isRequestingPrerenderedPage = false;

  if (!userAgent) { return false; }
  if (req.method.toLowerCase() !== 'get') { return false; }

  //if it contains _escaped_fragment_, show prerendered page
  if (req.url.query.hasOwnProperty('_escaped_fragment_')) {
    isRequestingPrerenderedPage = true;
  }

  //if it is a bot...show prerendered page
  var knownBot = internals.crawlerUserAgents.some(function (crawlerUserAgent) {
    return userAgent.toLowerCase().indexOf(crawlerUserAgent.toLowerCase()) !== -1;
  });
  
  if (knownBot) { isRequestingPrerenderedPage = true; }

  //if it is BufferBot...show prerendered page
  if (bufferAgent) { isRequestingPrerenderedPage = true; }

  //if it is a bot and is requesting a resource...dont prerender
  var resource = internals.extensionsToIgnore.some(function (extension) {
    var regexp = new RegExp(extension + '$');
    return regexp.test(req.url.pathname);
  });

  if (resource) { return false; }

  return isRequestingPrerenderedPage;
};

//
// Public API
//

exports.register = function (plugin, options, next) {

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

    //if (req.get('CF-Visitor')) {
    //  var match = req.get('CF-Visitor').match(/"scheme":"(http|https)"/);
    //  if (match) protocol = match[1];
    //}
    //if (req.get('X-Forwarded-Proto')) {
    //  protocol = req.get('X-Forwarded-Proto').split(',')[0];
    //}

    if (settings.protocol) {
      protocol = settings.protocol;
    }

    var fullUrl = protocol + "://" + req.headers.host + Url.format(req.url);
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

  plugin.ext('onRequest', function (req, next) {
    // Only handle requests with _escaped_fragment_ query param.
    if (!internals.shouldShowPrerenderedPage(req)) { return next(); }

    function reply(resp) {
      var r = next(resp.body);
      r.code(resp.statusCode);
      Object.getOwnPropertyNames(resp.headers).forEach(function (k) {
        r.header(k, resp.headers[k]);
      });
    }

    settings.beforeRender(req, function (err, cached) {
      if (!err && cached && typeof cached.body == 'string') {
        return reply(cached);
      }
    
      getPrerenderedPageResponse(req, function (err, resp) {
        if (err) {
          return console.error(err);
        }

        var prerenderedResponse = {
          statusCode: resp.statusCode,
          headers: resp.headers,
          body: resp.body
        };

        settings.afterRender(req, prerenderedResponse);
        reply(prerenderedResponse);
      });
    });
  });

  next();

};

exports.register.attributes = {
  pkg: require('./package.json')
};

