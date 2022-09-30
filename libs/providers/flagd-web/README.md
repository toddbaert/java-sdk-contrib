# Client-side flagD Provider for OpenFeature

![Experimental](https://img.shields.io/badge/experimental-breaking%20changes%20allowed-yellow)

Flagd is a simple daemon for evaluating feature flags.
It is designed to conform to OpenFeature schema for flag definitions.
This repository and package provides the client code for interacting with it via the OpenFeature JavaScript SDK.

## Installation

```
$ npm install @openfeature/flagd-web-provider
```

## Usage

The `FlagdWebProvider` communicates with flagd via the connect protocol.
Options can be defined in the constructor or as environment variables, with constructor options having the highest precedence.

### Available options

| Option name | Environment variable name | Type    | Default   |  Description   | 
| ----------- | ------------------------- | ------- | --------- | -------------- |
| host        | FLAGD_WEB_HOST                | string  | localhost | sets the host used to connect to the flagd instance |
| port        | FLAGD_WEB_PORT                | number  | 8013      | sets the port used to connect to the flagd instance |
| tls         | FLAGD_WEB_TLS                 | boolean | false     | when set to true the provider will attempt to connect to flagd via https |
| maxRetries       | FLAGD_WEB_MAX_RETRIES               | number | -     | sets the maximum number of retries for a connection to be made to the flagd instance |
| cache       | FLAGD_WEB_CACHE               | boolean | false     | when set to true the provider will use client side caching |
| cacheTTL       | FLAGD_WEB_CACHE_TTL               | number | 0     | sets the timeout for items in the cache, a value of 0 disables the timeout |
| cacheMaxBytes       | FLAGD_WEB_CACHE_MAX_BYTES               | number | -     | sets maximum size for the cache in bytes, when the threshold is reached the cache is emptied |


## Example

```go
OpenFeature.setProvider(new FlagdWebProvider({
  host: "localhost",
  port: 8013,
  tls: true,
  cache: true,
  cacheMaxBytes: 1,
  cacheTTL: 60,
  maxRetries: 10,
}))
```

## Running unit tests

Run `nx test providers-flagd-web` to execute the unit tests via [Jest](https://jestjs.io).
