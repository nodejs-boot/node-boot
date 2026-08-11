---
name: nodeboot-test-containers
description: Use when an integration test for a Node-Boot app needs any Docker container besides the framework's dedicated MongoDB hooks — Redis, a custom sidecar service, or (combined with `nodeboot-test-sql`) a real Postgres/MySQL instance — via the `useGenericContainer` hook in `@nodeboot/node-test` (backed by testcontainers). Load `nodeboot-test-framework` first for the base `useNodeBoot()` pattern.
---

# Generic Docker containers in tests (`useGenericContainer`)

Backed by [testcontainers](https://node.testcontainers.org/); starts/stops arbitrary Docker images
for the duration of a test suite. Demonstrated in
[`generic-container-demo.test.ts`](https://github.com/nodejs-boot/node-boot-test-framework/blob/main/demos/node-test-demo/test/generic-container-demo.test.ts).
For Mongo specifically, prefer [`nodeboot-test-mongodb`](../nodeboot-test-mongodb/SKILL.md)'s
dedicated hooks instead — they handle connection-string/env-var wiring for you.

## Single container

```ts
const {useGenericContainer} = useNodeBoot(EmptyApp, ({useGenericContainer}) => {
    useGenericContainer({
        containers: {
            alpine: {image: "alpine:latest", command: ["sleep", "60"]},
        },
    });
});

it("runs a command in the container", async () => {
    const alpine = useGenericContainer("alpine"); // named lookup — matches the config key above
    assert.ok(alpine.host);
    const result = await alpine.container.exec(["echo", "hello"]);
    assert.strictEqual(result.exitCode, 0);
});
```

## Multiple containers

Declare more entries under `containers`; each is an independent instance with its own `host`/
`container` handle, looked up by its config key:

```ts
useGenericContainer({
    containers: {
        alpine1: {image: "alpine:latest", command: ["sleep", "60"]},
        alpine2: {image: "alpine:latest", command: ["sleep", "60"]},
    },
});
// later: useGenericContainer("alpine1"), useGenericContainer("alpine2") — separate container IDs
```

## Using it for a real database (e.g. Postgres for SQL tests)

Add `environment`/`exposedPorts` as the image requires, then read the mapped port/host back to
wire into the app's `persistence` config — see
[`nodeboot-test-sql`](../nodeboot-test-sql/SKILL.md#real-parity-path--usegenericcontainer-with-postgresmysql)
for the full pattern.

## Validate

Requires a working Docker daemon locally and in CI. Run `pnpm test`; if containers fail to start,
check Docker is running and the image tag is pullable before debugging the test itself.
