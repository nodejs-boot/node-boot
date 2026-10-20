/**
 * Proves a bare application class gets the Nonna-backed IoC container, DI, auto-configuration,
 * and `@ConfigurationProperties` binding.
 *
 * Runs in its own file so its `ApplicationContext` state - a process-wide singleton - never
 * shares a Node test-runner subprocess with `ghost-server.it.test.ts`.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context";
import {useNodeBoot} from "@nodeboot/node-test";
import {DefaultDiTestApp} from "./fixtures/DefaultDiTestApp";
import {DefaultDiUserService} from "./fixtures/DefaultDiUserService";

describe("Ghost Server Adapter (Nonna DI)", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, nominally distinct from this monorepo's workspace package of the same name -
    // cast at the boundary rather than relaxing `DefaultDiTestApp`'s own typing.
    useNodeBoot(DefaultDiTestApp as any);

    test("resolves a @Service with an injected dependency and an injected @Bean value", () => {
        // Resolved from the workspace ApplicationContext (not `useService()`, which checks
        // `@nodeboot/node-test`'s own published `@nodeboot/context` dependency - a different
        // singleton instance than the workspace one this app actually boots against).
        const iocContainer = ApplicationContext.get().diOptions?.iocContainer;
        assert.ok(iocContainer, "a default DI container must have been set up ");

        const userService = iocContainer!.get(DefaultDiUserService);
        assert.equal(userService.welcome("Ada"), "Hello, Ada! Welcome to ghost-server-default-di-test.");
    });
});
