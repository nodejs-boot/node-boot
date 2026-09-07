import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {extractPlaceholderKey, isPlaceholder, toTargetClass} from "../src/utils";

describe("utils", () => {
    describe("extractPlaceholderKey", () => {
        it("extracts the key from a well-formed placeholder", () => {
            assert.equal(extractPlaceholderKey("${com.example.aws.sqs.queue-url}"), "com.example.aws.sqs.queue-url");
        });

        it("extracts a simple single-word key", () => {
            assert.equal(extractPlaceholderKey("${key}"), "key");
        });

        it("returns undefined for a plain (non-placeholder) string", () => {
            assert.equal(extractPlaceholderKey("https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"), undefined);
        });

        it("returns undefined for an empty string", () => {
            assert.equal(extractPlaceholderKey(""), undefined);
        });

        it("returns undefined when only the prefix is present", () => {
            assert.equal(extractPlaceholderKey("${unterminated"), undefined);
        });

        it("returns undefined when only the suffix is present", () => {
            assert.equal(extractPlaceholderKey("unterminated}"), undefined);
        });

        it("does not match when there is leading or trailing text around the placeholder", () => {
            assert.equal(extractPlaceholderKey("prefix-${key}"), undefined);
            assert.equal(extractPlaceholderKey("${key}-suffix"), undefined);
        });

        it("supports nested-looking braces by capturing everything between the outer markers", () => {
            // The regex is non-greedy but anchored to start/end, so nested "${" / "}" text
            // is just captured as part of the key content since there's only one closing brace.
            assert.equal(extractPlaceholderKey("${outer.${inner}}"), "outer.${inner}");
        });
    });

    describe("isPlaceholder", () => {
        it("returns true for a well-formed placeholder", () => {
            assert.equal(isPlaceholder("${com.example.aws.sqs.queue-url}"), true);
        });

        it("returns false for a plain string", () => {
            assert.equal(isPlaceholder("https://sqs.us-east-1.amazonaws.com/123456789012/my-queue"), false);
        });

        it("returns false for an empty string", () => {
            assert.equal(isPlaceholder(""), false);
        });

        it("returns false for a malformed placeholder missing braces", () => {
            assert.equal(isPlaceholder("$key"), false);
            assert.equal(isPlaceholder("{key}"), false);
        });
    });

    describe("toTargetClass", () => {
        class Foo {}

        it("returns the constructor unchanged when given a class constructor", () => {
            assert.equal(toTargetClass(Foo), Foo);
        });

        it("returns the constructor when given an instance", () => {
            const instance = new Foo();
            assert.equal(toTargetClass(instance), Foo);
        });

        it("throws a TypeError for a primitive number", () => {
            assert.throws(() => toTargetClass(42 as any), TypeError);
        });

        it("throws a TypeError for null", () => {
            assert.throws(() => toTargetClass(null as any), TypeError);
        });

        it("throws a TypeError for a plain string", () => {
            assert.throws(() => toTargetClass("not-a-class" as any), TypeError);
        });

        it("throws a TypeError for undefined", () => {
            assert.throws(() => toTargetClass(undefined as any), TypeError);
        });
    });
});
