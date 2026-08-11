---
name: nodeboot-test-mongodb
description: Use when writing integration tests for a Node-Boot app that uses MongoDB persistence (`@nodeboot/starter-persistence` with `persistence.type: mongodb`) — deciding between `useMongoMemoryServer` (fast in-memory), `useMongoMemoryReplSet` (replica set, needed for transactions/change streams), or `useMongoContainer` (real `mongo` Docker image via testcontainers) inside `@nodeboot/node-test`. Load `nodeboot-test-framework` first for the base `useNodeBoot()` pattern.
---

# Testing Node-Boot apps backed by MongoDB

Three hooks, in increasing order of realism/cost — pick the cheapest one that still exercises what
you're testing. All are demonstrated in
[`demos/node-test-demo/test`](https://github.com/nodejs-boot/node-boot-test-framework/tree/main/demos/node-test-demo/test)
of the [test framework repo](https://github.com/nodejs-boot/node-boot-test-framework). For the
app-side MongoDB starter setup being tested here, see
[`nodeboot-starter-persistence-mongodb`](../nodeboot-starter-persistence-mongodb/SKILL.md).

## `useMongoMemoryServer` — default choice

In-memory `mongodb-memory-server` instance, no Docker required, fastest. Use for any test that
doesn't need transactions or change streams.

```ts
const {useMongoMemoryServer} = useNodeBoot(EmptyApp, ({useMongoMemoryServer}) => {
    useMongoMemoryServer({instance: {dbName: "custom-test-db"}}); // port, dbName, storageEngine all optional
});

it("connects", () => {
    const {mongoUri, server} = useMongoMemoryServer();
    // process.env.MONGODB_URI is also set automatically for anything reading it directly
});
```

## `useMongoMemoryReplSet` — need transactions or change streams

Same in-memory engine, but as a replica set — required because standalone MongoDB (including
`useMongoMemoryServer`) doesn't support multi-document transactions.

```ts
const {useMongoMemoryReplSet} = useNodeBoot(EmptyApp, ({useMongoMemoryReplSet}) => {
    useMongoMemoryReplSet({replSet: {name: "custom-replset", dbName: "custom-test-db"}});
});

it("runs in a replica set", () => {
    const {mongoUri, replSet, servers} = useMongoMemoryReplSet();
    assert.ok(servers.length >= 1);
});
```

## `useMongoContainer` — need real MongoDB parity

Runs an actual `mongo` Docker image via testcontainers — use when validating behavior that
in-memory MongoDB doesn't faithfully reproduce (specific server version quirks, real replication
timing), or as a pre-release confidence check alongside faster in-memory tests elsewhere.

```ts
const {useRepository, useService, useConfig} = useNodeBoot(
    TestAppWithMongoPersistence,
    ({useConfig, usePactum, useMongoContainer}) => {
        useConfig({app: {port: 20000}});
        useMongoContainer({dbName: "test-db", image: "mongo:8"});
        usePactum();
    },
);

it("persists through the real repository", async () => {
    const userRepository = useRepository(UserRepository);
    const users = await userRepository.find({});
    assert.ok(users);
});
```

## Validate

Run the suite with `pnpm test` (or `node --test`); `useMongoMemoryServer`/`useMongoMemoryReplSet`
need no external services, `useMongoContainer` needs a working Docker daemon locally/in CI.
