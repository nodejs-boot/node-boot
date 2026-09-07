import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {
    SCAN_AWARE_METADATA_KEY,
    BEAN_METADATA_KEY,
    BEAN_NAME_METADATA_KEY,
    CONTROLLER_PATH_METADATA_KEY,
    CONTROLLER_VERSION_METADATA_KEY,
    LIFECYCLE_TYPE_METADATA_KEY,
    BEAN_PROFILE_METADATA_KEY,
} from "../src/metadata/metadata.keys";

describe("metadata.keys", () => {
    it("exports all keys as defined values", () => {
        assert.notEqual(SCAN_AWARE_METADATA_KEY, undefined);
        assert.notEqual(BEAN_METADATA_KEY, undefined);
        assert.notEqual(BEAN_NAME_METADATA_KEY, undefined);
        assert.notEqual(CONTROLLER_PATH_METADATA_KEY, undefined);
        assert.notEqual(CONTROLLER_VERSION_METADATA_KEY, undefined);
        assert.notEqual(LIFECYCLE_TYPE_METADATA_KEY, undefined);
        assert.notEqual(BEAN_PROFILE_METADATA_KEY, undefined);
    });

    it("uses Symbols for the Reflect-metadata style keys", () => {
        for (const key of [
            SCAN_AWARE_METADATA_KEY,
            BEAN_METADATA_KEY,
            BEAN_NAME_METADATA_KEY,
            CONTROLLER_PATH_METADATA_KEY,
            CONTROLLER_VERSION_METADATA_KEY,
        ]) {
            assert.equal(typeof key, "symbol");
        }
    });

    it("uses plain strings with a well-known prefix for the class-decorator-lifecycle keys", () => {
        assert.equal(typeof LIFECYCLE_TYPE_METADATA_KEY, "string");
        assert.equal(typeof BEAN_PROFILE_METADATA_KEY, "string");
        assert.equal(LIFECYCLE_TYPE_METADATA_KEY, "__Lifecycle-Type");
        assert.equal(BEAN_PROFILE_METADATA_KEY, "__Bean-Profile");
    });

    it("each Symbol key is unique (no two constants share the same Symbol identity)", () => {
        const symbolKeys = [
            SCAN_AWARE_METADATA_KEY,
            BEAN_METADATA_KEY,
            BEAN_NAME_METADATA_KEY,
            CONTROLLER_PATH_METADATA_KEY,
            CONTROLLER_VERSION_METADATA_KEY,
        ];
        const uniqueSymbols = new Set(symbolKeys);
        assert.equal(uniqueSymbols.size, symbolKeys.length);
    });

    it("string keys are not accidentally equal to one another", () => {
        assert.notEqual(LIFECYCLE_TYPE_METADATA_KEY, BEAN_PROFILE_METADATA_KEY);
    });

    it("Symbol keys carry a human-readable description for debuggability", () => {
        assert.equal(SCAN_AWARE_METADATA_KEY.description, "Scan-Aware");
        assert.equal(BEAN_METADATA_KEY.description, "Bean");
        assert.equal(BEAN_NAME_METADATA_KEY.description, "Bean-Name");
        assert.equal(CONTROLLER_PATH_METADATA_KEY.description, "Controller-Path");
        assert.equal(CONTROLLER_VERSION_METADATA_KEY.description, "Controller-Version");
    });
});
