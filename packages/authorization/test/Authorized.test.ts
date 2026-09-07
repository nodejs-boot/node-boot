import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";

import {NodeBootToolkit} from "@nodeboot/engine";
import {Authorized} from "../src";

describe("Authorized decorator", () => {
    beforeEach(() => {
        NodeBootToolkit.reset();
    });

    it("registers a class-level entry with target as the class itself when applied without a method", () => {
        class TestController {}

        const before = NodeBootToolkit.getMetadataArgsStorage().responseHandlers.length;

        Authorized()(TestController);

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        assert.equal(responseHandlers.length, before + 1);

        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.equal(entry.type, "authorized");
        assert.equal(entry.target, TestController);
        assert.equal(entry.method, undefined);
        assert.equal(entry.value, undefined);
    });

    it("registers a method-level entry with target as the owning class (constructor)", () => {
        class TestController {
            action() {}
        }

        const before = NodeBootToolkit.getMetadataArgsStorage().responseHandlers.length;

        Authorized()(TestController.prototype, "action");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        assert.equal(responseHandlers.length, before + 1);

        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.equal(entry.type, "authorized");
        assert.equal(entry.target, TestController);
        assert.equal(entry.method, "action");
        assert.equal(entry.value, undefined);
    });

    it("supports no roles argument (Authorized())", () => {
        class TestController {
            action() {}
        }

        Authorized()(TestController.prototype, "action");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.equal(entry.value, undefined);
    });

    it("supports a single role string argument", () => {
        class TestController {
            action() {}
        }

        Authorized("admin")(TestController.prototype, "action");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.equal(entry.value, "admin");
    });

    it("supports an array of role strings", () => {
        class TestController {
            action() {}
        }

        Authorized(["admin", "user"])(TestController.prototype, "action");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.deepEqual(entry.value, ["admin", "user"]);
    });

    it("supports a function role argument", () => {
        class TestController {
            action() {}
        }

        function customRoleChecker() {
            return true;
        }

        Authorized(customRoleChecker)(TestController.prototype, "action");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        const entry = responseHandlers[responseHandlers.length - 1]!;
        assert.equal(entry.value, customRoleChecker);
    });

    it("accumulates multiple entries across multiple decorations", () => {
        class TestController {
            actionA() {}
            actionB() {}
        }

        Authorized("admin")(TestController.prototype, "actionA");
        Authorized(["editor"])(TestController.prototype, "actionB");

        const responseHandlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
        assert.equal(responseHandlers.length, 2);
        assert.equal(responseHandlers[0]!.method, "actionA");
        assert.equal(responseHandlers[1]!.method, "actionB");
    });
});
