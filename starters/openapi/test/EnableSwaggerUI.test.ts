import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context";
import {EnableSwaggerUI} from "../src";

describe("EnableSwaggerUI decorator", () => {
    test("sets ApplicationContext.get().swaggerUI to true", () => {
        ApplicationContext.get().swaggerUI = false;
        const decorator = EnableSwaggerUI();
        class TestApp {}
        decorator(TestApp);

        assert.equal(ApplicationContext.get().swaggerUI, true);
    });
});
