# Pass Through PG

> Caching pass-through content-proxy

Simple proxy to pass-through content, and cache it.

# Architecture

## server.js

`server.js` is a pass-through caching proxy- it will attempt to server from the cache, and if it can't, it will forward the request to the `APP_SERVICE` target and cache any 200 response it gets.

## api.js

`api.js` is a management API service for pass-through-pg. It's main responsibility is to present an interface for clearing caches. To this effect, it presents two routes:

* `/flushall` which will remove all cache.
* `/flush/<domain>` which will flush one domain.
