import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {HttpError} from "../src/http-error/HttpError";
import {BadRequestError} from "../src/http-error/BadRequestError";
import {ForbiddenError} from "../src/http-error/ForbiddenError";
import {InternalServerError} from "../src/http-error/InternalServerError";
import {MethodNotAllowedError} from "../src/http-error/MethodNotAllowedError";
import {NotAcceptableError} from "../src/http-error/NotAcceptableError";
import {NotFoundError} from "../src/http-error/NotFoundError";
import {UnauthorizedError} from "../src/http-error/UnauthorizedError";

describe("HttpError", () => {
    it("should set the httpCode and default to an empty message", () => {
        const error = new HttpError(500);

        assert.equal(error.httpCode, 500);
        assert.equal(error.message, "");
    });

    it("should be an instance of Error and HttpError", () => {
        const error = new HttpError(500);

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
    });

    it("should set a custom message when provided", () => {
        const error = new HttpError(418, "I'm a teapot");

        assert.equal(error.httpCode, 418);
        assert.equal(error.message, "I'm a teapot");
    });

    it("should not set httpCode when a falsy code is provided", () => {
        const error = new HttpError(0);

        assert.equal(error.httpCode, undefined);
    });

    it("should not override the message when a falsy message is provided", () => {
        const error = new HttpError(500, "");

        assert.equal(error.message, "");
    });

    it("should have a stack trace", () => {
        const error = new HttpError(500);

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });

    it("should default to the base Error name since HttpError does not override it", () => {
        const error = new HttpError(500);

        assert.equal(error.name, "Error");
    });
});

/**
 * Table-driven coverage for the simple HttpError subclasses that all share the
 * same shape: `constructor(message?: string)` and a fixed httpCode.
 */
const simpleHttpErrorClasses: Array<{
    name: string;
    httpCode: number;
    ctor: new (message?: string) => HttpError;
}> = [
    {name: "BadRequestError", httpCode: 400, ctor: BadRequestError},
    {name: "ForbiddenError", httpCode: 403, ctor: ForbiddenError},
    {name: "MethodNotAllowedError", httpCode: 405, ctor: MethodNotAllowedError},
    {name: "NotAcceptableError", httpCode: 406, ctor: NotAcceptableError},
    {name: "NotFoundError", httpCode: 404, ctor: NotFoundError},
    {name: "UnauthorizedError", httpCode: 401, ctor: UnauthorizedError},
];

for (const {name, httpCode, ctor} of simpleHttpErrorClasses) {
    describe(name, () => {
        it(`should default to httpCode ${httpCode} and an empty message`, () => {
            const error = new ctor();

            assert.equal(error.httpCode, httpCode);
            assert.equal(error.message, "");
            assert.equal(error.name, name);
        });

        it("should accept a custom message", () => {
            const error = new ctor("custom message");

            assert.equal(error.httpCode, httpCode);
            assert.equal(error.message, "custom message");
        });

        it("should be an instanceof Error and HttpError", () => {
            const error = new ctor();

            assert.ok(error instanceof Error);
            assert.ok(error instanceof HttpError);
            assert.ok(error instanceof ctor);
        });

        it("should have a stack trace", () => {
            const error = new ctor();

            assert.equal(typeof error.stack, "string");
            assert.ok(error.stack!.length > 0);
        });
    });
}

describe("InternalServerError", () => {
    it("should set httpCode 500 and the provided message", () => {
        const error = new InternalServerError("something went wrong");

        assert.equal(error.httpCode, 500);
        assert.equal(error.message, "something went wrong");
        assert.equal(error.name, "InternalServerError");
    });

    it("should be an instanceof Error and HttpError", () => {
        const error = new InternalServerError("boom");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof InternalServerError);
    });

    it("should not override message with an empty string", () => {
        const error = new InternalServerError("");

        assert.equal(error.message, "");
    });

    it("should have a stack trace", () => {
        const error = new InternalServerError("boom");

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});
