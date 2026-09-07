/**
 * Auto-configuration integration test for `@nodeboot/starter-openai` - negative case.
 *
 * Same `OpenAiEnabledApp` fixture (still applies `@EnableOpenAI()`), but boots without any
 * `integrations.openai` config - `OpenAIConfiguration`'s `@Bean` warns and skips registration
 * instead of throwing.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import OpenAI from "openai";
import {useNodeBoot} from "@nodeboot/node-test";
import {OpenAiEnabledApp} from "./fixtures/OpenAiEnabledApp";

describe("@nodeboot/starter-openai auto-configuration - integrations.openai not configured", () => {
    useNodeBoot(OpenAiEnabledApp as any, ({useConfig}) => {
        useConfig({app: {name: "starter-openai-disabled-test"}});
    });

    test("never registers an OpenAI client in the IoC container", () => {
        assert.equal(Container.has(OpenAI), false);
    });
});
