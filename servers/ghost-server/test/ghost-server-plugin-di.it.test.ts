/**
 * Proves `@EnableDI(container)` still lets an application plug in its own DI container (TypeDI here)
 * instead of the Nonna default.
 *
 * Runs in its own file so its `ApplicationContext` state - a process-wide singleton - never shares a
 * Node test-runner subprocess with the default-DI test.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {ApplicationContext} from "@nodeboot/context";
import {useNodeBoot} from "@nodeboot/node-test";
import {PluginDiTestApp} from "./fixtures/PluginDiTestApp";
import {PluginDiUserService} from "./fixtures/PluginDiUserService";

describe("Ghost Server Adapter (DI plugin via @EnableDI)", () => {
    useNodeBoot(PluginDiTestApp as any);

    test("uses the supplied container rather than the Nonna default", () => {
        assert.equal(ApplicationContext.get().diOptions?.iocContainer, Container);
    });

    test("resolves a @Service whose dependency is injected by the plugin container", () => {
        const userService = ApplicationContext.get().diOptions!.iocContainer.get(PluginDiUserService);
        assert.equal(userService.welcome("Ada"), "Hello, Ada! (resolved through TypeDI)");
    });
});
