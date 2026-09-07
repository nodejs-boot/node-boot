/**
 * Auto-configuration integration test for `@nodeboot/starter-validation` - negative case.
 *
 * Boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on a real HTTP server)
 * that deliberately never applies `@EnableValidations()`. Contrasted against
 * `validation-enabled.it.test.ts`'s `StrictApp`, which is identical except for that one decorator
 * plus its `api.validations` config. Kept in a separate file/app boot because `@nodeboot/node-test`
 * does not support booting more than one `useNodeBoot()` app per file (a second app's lifecycle
 * hooks silently fail to complete).
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {DefaultApp} from "./fixtures/DefaultApp";

const TEST_PORT = 34882;

describe("@nodeboot/starter-validation auto-configuration - no @EnableValidations() applied", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing `DefaultApp`'s typing.
    const {useHttp} = useNodeBoot(DefaultApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-validation-default-test", port: TEST_PORT}});
    });

    let http: ReturnType<typeof useHttp>;

    before(() => {
        http = useHttp();
        http.defaults.validateStatus = () => true;
    });

    test("still validates built-in constraints (that default belongs to @nodeboot/engine, not this starter)", async () => {
        const response = await http.post("/users", {email: "not-an-email", name: "Jane"});

        assert.equal(response.status, 400);
    });

    test("does NOT reject an unknown property, since there is no starter-provided whitelist config", async () => {
        const response = await http.post("/users", {
            email: "jane@example.com",
            name: "Jane",
            admin: true,
        });

        assert.equal(response.status, 200);
        // Without the starter's `whitelist` option, class-transformer/class-validator neither
        // stripped nor rejected the unrecognized property - proof that it's this starter,
        // not the framework by default, that is responsible for the strict behavior in
        // `validation-enabled.it.test.ts`.
        assert.equal(response.data.admin, true);
    });
});
