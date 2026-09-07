/**
 * Auto-configuration integration test for `@nodeboot/starter-openai` - positive case.
 *
 * See `openai-disabled.it.test.ts` for the negative counterpart (no `integrations.openai` config,
 * same app).
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import OpenAI from "openai";
import {useNodeBoot} from "@nodeboot/node-test";
import {OpenAiEnabledApp} from "./fixtures/OpenAiEnabledApp";

describe("@nodeboot/starter-openai auto-configuration - integrations.openai configured", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(OpenAiEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-openai-enabled-test"},
            integrations: {openai: {apiKey: "test-key", baseURL: "https://openai.example.com/v1"}},
        });
    });

    test("registers a real OpenAI client configured with the baseURL/apiKey from app-config", () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired the client into.
        const client = Container.get(OpenAI);

        assert.ok(client instanceof OpenAI);
        assert.equal(client.baseURL, "https://openai.example.com/v1");
        assert.equal(client.apiKey, "test-key");
    });
});
