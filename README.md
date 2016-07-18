# hapi-prerender

[![Build Status](https://travis-ci.org/wrangr/hapi-prerender.png)](https://travis-ci.org/wrangr/hapi-prerender)
[![Dependency Status](https://david-dm.org/wrangr/hapi-prerender.svg?style=flat)](https://david-dm.org/wrangr/hapi-prerender)
[![devDependency Status](https://david-dm.org/wrangr/hapi-prerender/dev-status.png)](https://david-dm.org/wrangr/hapi-prerender#info=devDependencies)

HAPI plugin for prerendering javascript-rendered pages on the fly for SEO.

## Installing

`$ npm install hapi-prerender --save`

## Examples

Basic usage:

```js
var Hapi = require('hapi');
var PrerenderPlugin = require('hapi-prerender');
var server = new Hapi.Server();

server.register(PrerenderPlugin, function (err) {
  // plugin was registered!
});
```

Using `prerender.io` hosted service.

```js
server.register({
  register: require('hapi-prerender'),
  options: {
    token: 'YOUR-PRERENDER.IO-TOKEN'
  }
});
```

Using your own prerender server:

```js
server.register({
  register: require('hapi-prerender'),
  options: {
    serviceUrl: 'http://your-prerender-server'
  }
});
```

## Options

### `token`

If you have an account on prerender.io and want to use your token.

### `serviceUrl`

URL to prerender service. Defaults to `http://service.prerender.io/`. If you
host your own prerender server you can use this to point the plugin to your
server.

### `protocol`

Option to hard-set the protocol. Useful for sites that are available on both
http and https.

### `beforeRender`

This method gets called just before prerendering. If a value is passed in the
`done()` callback this will be returned to the client. This can be used for
caching.

```js
...
beforeRender: function (req, done) {
  // `cachedResponse` should be an object with `statusCode`, `headers` and
  // `body` properties.
  done(cachedResponse);
},
...
```

### `afterRender`

This method gets called after a page has been prerendered using the prerender
service. Use this method to cache prerendered responses.

```js
...
afterRender: function (req, prerenderedResponse) {
  // cache `prerenderedResponse` so it can later be used by `afterRender`.
  // `prerenderedResponse` is an object with `statusCode`, `headers` and
  // `body` properties.
},
...
```

## TODO

* Cloudflare Flexible SSL support
* Heroku SSL Addon support
* Implement `whitelist` and `blacklist` options

## License

The MIT License (MIT)

Copyright (c) 2014 Lupo Montero &lt;lupo@wrangr.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
