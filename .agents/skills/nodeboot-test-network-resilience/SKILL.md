---
name: nodeboot-test-network-resilience
description: Use when a Node-Boot integration test needs to simulate network conditions between the app and a dependency — added latency, jitter, bandwidth limits, or a fully broken connection — via the `useToxiproxy` hook in `@nodeboot/node-test` (backed by the Toxiproxy Docker container). Load `nodeboot-test-framework` first for the base `useNodeBoot()` pattern.
---

# Network fault injection in tests (`useToxiproxy`)

Wraps a real dependency (e.g. Redis, an upstream HTTP service) behind a
[Toxiproxy](https://github.com/Shopify/toxiproxy) proxy so tests can inject latency, bandwidth
limits, or full outages and assert the app degrades/retries correctly. Demonstrated in
[`toxiproxy-demo.test.ts`](https://github.com/nodejs-boot/node-boot-test-framework/blob/main/demos/node-test-demo/test/toxiproxy-demo.test.ts).

Calling `useToxiproxy()` with no config just starts the Toxiproxy container itself, without
declaring a proxy — call it without config **and** without declaring proxies only if you plan to
add proxies later; otherwise declare `proxies` up front:

```ts
const {useToxiproxy} = useNodeBoot(EmptyApp, ({useToxiproxy}) => {
    useToxiproxy({
        proxies: [{name: "redis", upstream: "localhost:6379"}],
    });
});

it("has a working proxy", () => {
    const {getProxy} = useToxiproxy();
    const redisProxy = getProxy("redis");
    // the app should be configured to connect through redisProxy.host:redisProxy.port,
    // not directly to the real upstream, so toxics actually affect it
});
```

**Important:** the app under test must connect through the proxy's `host:port`, not the real
upstream — wire that into `useConfig`'s overrides for whatever config key holds the dependency's
address (e.g. `redis.host`/`redis.port`), reading it from `getProxy(...)` after the container
starts.

## Toxics — inject specific fault types

Declared per-proxy under `toxics`:

```ts
useToxiproxy({
    proxies: [
        {
            name: "slow-redis",
            upstream: "localhost:6379",
            toxics: [{type: "latency", stream: "downstream", attributes: {latency: 1000, jitter: 100}}],
        },
    ],
});
```

Other toxic `type`s follow the same shape, e.g. `bandwidth` (`attributes: {rate: <KB/s>}`). Runtime
control once the suite is running:

```ts
const {addToxic, removeToxic, disableProxy, enableProxy, getProxy} = useToxiproxy();
```

`disableProxy`/`enableProxy` simulate a full outage/recovery without redeclaring toxics.

## Validate

Requires a working Docker daemon (Toxiproxy itself runs as a container). Run `pnpm test`, and
confirm the app's resilience logic (retries, circuit breakers, timeouts) actually reacts to the
injected fault — a passing test with no assertion on the degraded behavior isn't meaningfully
testing resilience.
