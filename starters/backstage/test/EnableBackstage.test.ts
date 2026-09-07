import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {EnableBackstage} from "../src";

describe("@nodeboot/starter-backstage EnableBackstage Decorator Tests", () => {
    test("@EnableBackstage returns a class decorator and executes constructor without throwing", () => {
        const decorator = EnableBackstage();
        assert.equal(typeof decorator, "function");

        class TestAppClass {}

        assert.doesNotThrow(() => {
            decorator(TestAppClass);
        });
    });
});
