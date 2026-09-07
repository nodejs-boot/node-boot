import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";

import {NodeBootToolkit} from "@nodeboot/engine";
import {CurrentUser} from "../src";

describe("CurrentUser decorator", () => {
    beforeEach(() => {
        NodeBootToolkit.reset();
    });

    it("registers a params entry defaulting required to false when no options are provided", () => {
        class TestController {
            action(_user?: any) {}
        }

        const before = NodeBootToolkit.getMetadataArgsStorage().params.length;

        CurrentUser()(TestController.prototype, "action", 0);

        const params = NodeBootToolkit.getMetadataArgsStorage().params;
        assert.equal(params.length, before + 1);

        const entry = params[params.length - 1]!;
        assert.equal(entry.type, "current-user");
        assert.equal(entry.object, TestController.prototype);
        assert.equal(entry.method, "action");
        assert.equal(entry.index, 0);
        assert.equal(entry.parse, false);
        assert.equal(entry.required, false);
    });

    it("registers a params entry defaulting required to false when options object has no required field", () => {
        class TestController {
            action(_user?: any) {}
        }

        CurrentUser({})(TestController.prototype, "action", 0);

        const params = NodeBootToolkit.getMetadataArgsStorage().params;
        const entry = params[params.length - 1]!;
        assert.equal(entry.required, false);
    });

    it("registers a params entry with required true when explicitly requested", () => {
        class TestController {
            action(_user?: any) {}
        }

        CurrentUser({required: true})(TestController.prototype, "action", 0);

        const params = NodeBootToolkit.getMetadataArgsStorage().params;
        const entry = params[params.length - 1]!;
        assert.equal(entry.type, "current-user");
        assert.equal(entry.required, true);
        assert.equal(entry.parse, false);
    });

    it("registers a params entry with required false when explicitly set to false", () => {
        class TestController {
            action(_user?: any) {}
        }

        CurrentUser({required: false})(TestController.prototype, "action", 0);

        const params = NodeBootToolkit.getMetadataArgsStorage().params;
        const entry = params[params.length - 1]!;
        assert.equal(entry.required, false);
    });

    it("captures the correct parameter index for multi-parameter methods", () => {
        class TestController {
            action(_a: any, _user?: any) {}
        }

        CurrentUser()(TestController.prototype, "action", 1);

        const params = NodeBootToolkit.getMetadataArgsStorage().params;
        const entry = params[params.length - 1]!;
        assert.equal(entry.index, 1);
        assert.equal(entry.method, "action");
    });
});
