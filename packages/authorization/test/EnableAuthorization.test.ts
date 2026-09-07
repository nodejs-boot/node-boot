import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";
import {EnableAuthorization} from "../src";

class DummyCurrentUserChecker implements CurrentUserChecker {
    async check(): Promise<any> {
        return {id: "user-1"};
    }
}

class DummyAuthorizationChecker implements AuthorizationChecker {
    async check(): Promise<boolean> {
        return true;
    }
}

class OtherCurrentUserChecker implements CurrentUserChecker {
    async check(): Promise<any> {
        return {id: "user-2"};
    }
}

class OtherAuthorizationChecker implements AuthorizationChecker {
    async check(): Promise<boolean> {
        return false;
    }
}

describe("EnableAuthorization decorator", () => {
    it("sets only the currentUserChecker when only that argument is provided", () => {
        // Reset the fields under test to a known state before asserting.
        ApplicationContext.get().currentUserChecker = undefined;
        ApplicationContext.get().authorizationChecker = undefined;

        EnableAuthorization(DummyCurrentUserChecker)();

        assert.equal(ApplicationContext.get().currentUserChecker, DummyCurrentUserChecker);
        assert.equal(ApplicationContext.get().authorizationChecker, undefined);
    });

    it("sets only the authorizationChecker when only that argument is provided", () => {
        ApplicationContext.get().currentUserChecker = undefined;
        ApplicationContext.get().authorizationChecker = undefined;

        EnableAuthorization(undefined, DummyAuthorizationChecker)();

        assert.equal(ApplicationContext.get().authorizationChecker, DummyAuthorizationChecker);
        assert.equal(ApplicationContext.get().currentUserChecker, undefined);
    });

    it("sets both checkers when both arguments are provided", () => {
        ApplicationContext.get().currentUserChecker = undefined;
        ApplicationContext.get().authorizationChecker = undefined;

        EnableAuthorization(DummyCurrentUserChecker, DummyAuthorizationChecker)();

        assert.equal(ApplicationContext.get().currentUserChecker, DummyCurrentUserChecker);
        assert.equal(ApplicationContext.get().authorizationChecker, DummyAuthorizationChecker);
    });

    it("leaves both checkers untouched when neither argument is provided", () => {
        // Prime the context with sentinel values, then verify they are not overwritten.
        ApplicationContext.get().currentUserChecker = OtherCurrentUserChecker;
        ApplicationContext.get().authorizationChecker = OtherAuthorizationChecker;

        EnableAuthorization()();

        assert.equal(ApplicationContext.get().currentUserChecker, OtherCurrentUserChecker);
        assert.equal(ApplicationContext.get().authorizationChecker, OtherAuthorizationChecker);
    });

    it("overwrites previously set checkers when new ones are provided", () => {
        ApplicationContext.get().currentUserChecker = OtherCurrentUserChecker;
        ApplicationContext.get().authorizationChecker = OtherAuthorizationChecker;

        EnableAuthorization(DummyCurrentUserChecker, DummyAuthorizationChecker)();

        assert.equal(ApplicationContext.get().currentUserChecker, DummyCurrentUserChecker);
        assert.equal(ApplicationContext.get().authorizationChecker, DummyAuthorizationChecker);
    });
});
