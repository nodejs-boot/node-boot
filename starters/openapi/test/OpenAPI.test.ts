import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {getOpenAPIMetadata, OpenAPI} from "../src";

describe("OpenAPI decorator", () => {
    test("attaches OpenAPI metadata to a controller class", () => {
        @OpenAPI({summary: "Class Level Summary", tags: ["ClassTag"]})
        class TestController {}

        const metadata = getOpenAPIMetadata(TestController);
        assert.equal(metadata.length, 1);
        assert.deepEqual(metadata[0], {summary: "Class Level Summary", tags: ["ClassTag"]});
    });

    test("attaches OpenAPI metadata to a controller method", () => {
        class TestController {
            @OpenAPI({summary: "Method Level Summary", description: "Method description"})
            testMethod() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "testMethod");
        assert.equal(metadata.length, 1);
        assert.deepEqual(metadata[0], {
            summary: "Method Level Summary",
            description: "Method description",
        });
    });

    test("supports function parameter modifier for OpenAPI metadata", () => {
        const customModifier = (source: any) => ({
            ...source,
            summary: "Modified Summary",
        });

        class TestController {
            @OpenAPI(customModifier)
            testMethod() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "testMethod");
        assert.equal(metadata.length, 1);
        assert.equal(typeof metadata[0], "function");
    });
});
