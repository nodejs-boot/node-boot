import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context";
import {EnableActuator} from "../src";
import {DefaultActuatorAdapter} from "../src/adapter";

describe("EnableActuator decorator", () => {
    test("registers DefaultActuatorAdapter into ApplicationContext", () => {
        const decorator = EnableActuator();
        class TestApp {}
        decorator(TestApp);

        const context = ApplicationContext.get();
        assert.ok(context.actuatorAdapter);
        assert.ok(context.actuatorAdapter instanceof DefaultActuatorAdapter);
    });
});
