# hapi-prerender

HAPI plugin for prerendering javascript-rendered pages on the fly for SEO

## Examples:

Using `prerender.io` hosted service.

```js
var Hapi = require('hapi');
var server = new Hapi.Server();

server.pack.register({
  plugin: require('hapi-prerender'),
  options: {
    token: 'YOUR-PRERENDER.IO-TOKEN'
  }
});
```

Using your own prerender server:

```js
var Hapi = require('hapi');
var server = new Hapi.Server();

server.pack.register({
  plugin: require('hapi-prerender'),
  options: {
    serviceUrl: 'http://your-prerender-server'
  }
});
```

## Options

* `serviceUrl`
* `token`
* `protocol`
