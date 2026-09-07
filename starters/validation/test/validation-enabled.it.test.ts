/**
 * Auto-configuration integration test for `@nodeboot/starter-validation` - positive case.
 *
 * The unit tests elsewhere in this package (`ValidationsConfiguration.test.ts`,
 * `ValidationsAutoConfiguration.test.ts`, `class-validator-options.test.ts`) exercise the
 * starter's internal pieces directly - the `@Bean` factory method, the `@Configuration`
 * discovery wiring, `class-validator` options in isolation. None of them prove the starter
 * actually autowires into a *running* Node-Boot application the way a real app would use it.
 *
 * This test boots a real Node-Boot app (via `@nodeboot/node-test`'s `useNodeBoot`, on a real HTTP
 * server) with `@EnableValidations()` applied and a custom `api.validations` config
 * (`whitelist` + `forbidNonWhitelisted`), and drives it over real HTTP. See
 * `validation-disabled.it.test.ts` for the negative counterpart this is contrasted against - kept
 * in a separate file/app boot because `@nodeboot/node-test` does not support booting more than one
 * `useNodeBoot()` app per file (a second app's lifecycle hooks silently fail to complete).
 */
import {before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {useNodeBoot} from "@nodeboot/node-test";
import {StrictApp} from "./fixtures/StrictApp";

const TEST_PORT = 34881;

describe("@nodeboot/starter-validation auto-configuration - @EnableValidations() with a custom config", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing `StrictApp`'s typing.
    const {useHttp} = useNodeBoot(StrictApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-validation-strict-test", port: TEST_PORT},
            api: {validations: {whitelist: true, forbidNonWhitelisted: true}},
        });
    });

    let http: ReturnType<typeof useHttp>;

    before(() => {
        http = useHttp();
        http.defaults.validateStatus = () => true;
    });

    test("accepts a well-formed body", async () => {
        const response = await http.post("/users", {email: "jane@example.com", name: "Jane"});

        assert.equal(response.status, 200);
        assert.deepEqual(response.data, {email: "jane@example.com", name: "Jane"});
    });

    test("still rejects a body that fails a built-in constraint", async () => {
        const response = await http.post("/users", {email: "not-an-email", name: "Jane"});

        assert.equal(response.status, 400);
    });

    test("rejects an unknown property because 'forbidNonWhitelisted' is configured", async () => {
        const response = await http.post("/users", {
            email: "jane@example.com",
            name: "Jane",
            admin: true,
        });

        assert.equal(response.status, 400);
        assert.ok(Array.isArray(response.data.errors));
        assert.ok(
            response.data.errors.some((error: any) => error.property === "admin"),
            `expected a validation error for the unexpected "admin" property, got: ${JSON.stringify(response.data)}`,
        );
    });
});
