import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {HttpError} from "../src/http-error/HttpError";
import {ForbiddenError} from "../src/http-error/ForbiddenError";
import {UnauthorizedError} from "../src/http-error/UnauthorizedError";
import {InternalServerError} from "../src/http-error/InternalServerError";
import {BadRequestError} from "../src/http-error/BadRequestError";

import {AccessDeniedError} from "../src/error/AccessDeniedError";
import {AuthorizationCheckerNotDefinedError} from "../src/error/AuthorizationCheckerNotDefinedError";
import {AuthorizationRequiredError} from "../src/error/AuthorizationRequiredError";
import {CurrentUserCheckerNotDefinedError} from "../src/error/CurrentUserCheckerNotDefinedError";
import {InvalidParamError} from "../src/error/ParamNormalizationError";
import {ParamRequiredError} from "../src/error/ParamRequiredError";
import {ParameterParseJsonError} from "../src/error/ParameterParseJsonError";

describe("AccessDeniedError", () => {
    it("should build the message from method and url", () => {
        const error = new AccessDeniedError("GET", "/api/users");

        assert.equal(error.message, "Access is denied for request on GET /api/users");
        assert.equal(error.name, "AccessDeniedError");
    });

    it("should carry the 403 httpCode inherited from ForbiddenError", () => {
        const error = new AccessDeniedError("POST", "/api/orders");

        assert.equal(error.httpCode, 403);
    });

    it("should be an instanceof Error, HttpError, ForbiddenError and AccessDeniedError", () => {
        const error = new AccessDeniedError("GET", "/");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof ForbiddenError);
        assert.ok(error instanceof AccessDeniedError);
    });

    it("should have a stack trace", () => {
        const error = new AccessDeniedError("GET", "/");

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});

describe("AuthorizationCheckerNotDefinedError", () => {
    it("should have a fixed descriptive message", () => {
        const error = new AuthorizationCheckerNotDefinedError();

        assert.equal(
            error.message,
            "Cannot use @Authorized decorator. Please define authorizationChecker function in Node-Boot action before using it.",
        );
        assert.equal(error.name, "AuthorizationCheckerNotDefinedError");
    });

    it("should carry the 500 httpCode inherited from InternalServerError", () => {
        const error = new AuthorizationCheckerNotDefinedError();

        assert.equal(error.httpCode, 500);
    });

    it("should be an instanceof Error, HttpError, InternalServerError and AuthorizationCheckerNotDefinedError", () => {
        const error = new AuthorizationCheckerNotDefinedError();

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof InternalServerError);
        assert.ok(error instanceof AuthorizationCheckerNotDefinedError);
    });

    it("should have a stack trace", () => {
        const error = new AuthorizationCheckerNotDefinedError();

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});

describe("AuthorizationRequiredError", () => {
    it("should build the message from method and url", () => {
        const error = new AuthorizationRequiredError("DELETE", "/api/sessions/1");

        assert.equal(error.message, "Authorization is required for request on DELETE /api/sessions/1");
        assert.equal(error.name, "AuthorizationRequiredError");
    });

    it("should carry the 401 httpCode inherited from UnauthorizedError", () => {
        const error = new AuthorizationRequiredError("GET", "/");

        assert.equal(error.httpCode, 401);
    });

    it("should be an instanceof Error, HttpError, UnauthorizedError and AuthorizationRequiredError", () => {
        const error = new AuthorizationRequiredError("GET", "/");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof UnauthorizedError);
        assert.ok(error instanceof AuthorizationRequiredError);
    });

    it("should have a stack trace", () => {
        const error = new AuthorizationRequiredError("GET", "/");

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});

describe("CurrentUserCheckerNotDefinedError", () => {
    it("should have a fixed descriptive message", () => {
        const error = new CurrentUserCheckerNotDefinedError();

        assert.equal(
            error.message,
            "Cannot use @CurrentUser decorator. Please define currentUserChecker function in Node-Boot action before using it.",
        );
        assert.equal(error.name, "CurrentUserCheckerNotDefinedError");
    });

    it("should carry the 500 httpCode inherited from InternalServerError", () => {
        const error = new CurrentUserCheckerNotDefinedError();

        assert.equal(error.httpCode, 500);
    });

    it("should be an instanceof Error, HttpError, InternalServerError and CurrentUserCheckerNotDefinedError", () => {
        const error = new CurrentUserCheckerNotDefinedError();

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof InternalServerError);
        assert.ok(error instanceof CurrentUserCheckerNotDefinedError);
    });

    it("should have a stack trace", () => {
        const error = new CurrentUserCheckerNotDefinedError();

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});

describe("InvalidParamError", () => {
    it("should build the message including the JSON-stringified value", () => {
        const error = new InvalidParamError("abc", "age", "number");

        assert.equal(error.message, 'Given parameter age is invalid. Value ("abc") cannot be parsed into number.');
        assert.equal(error.name, "ParamNormalizationError");
    });

    it("should stringify object values", () => {
        const error = new InvalidParamError({a: 1}, "filter", "FilterDto");

        assert.equal(
            error.message,
            'Given parameter filter is invalid. Value ({"a":1}) cannot be parsed into FilterDto.',
        );
    });

    it("should render an undefined value as the literal 'undefined'", () => {
        const error = new InvalidParamError(undefined, "id", "number");

        assert.equal(error.message, "Given parameter id is invalid. Value (undefined) cannot be parsed into number.");
    });

    it("should carry the 400 httpCode inherited from BadRequestError", () => {
        const error = new InvalidParamError("abc", "age", "number");

        assert.equal(error.httpCode, 400);
    });

    it("should be an instanceof Error, HttpError, BadRequestError and InvalidParamError", () => {
        const error = new InvalidParamError("abc", "age", "number");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof BadRequestError);
        assert.ok(error instanceof InvalidParamError);
    });
});

describe("ParamRequiredError", () => {
    const action = {method: "POST", url: "/api/users"};

    it("should build a message for a 'param' type", () => {
        const error = new ParamRequiredError(action, {type: "param", name: "id"});

        assert.equal(error.message, 'Parameter "id" is required for request on POST /api/users');
    });

    it("should build a message for a 'body' type", () => {
        const error = new ParamRequiredError(action, {type: "body", name: ""});

        assert.equal(error.message, "Request body is required for request on POST /api/users");
    });

    it("should build a message for a 'body-param' type", () => {
        const error = new ParamRequiredError(action, {type: "body-param", name: "email"});

        assert.equal(error.message, 'Body parameter "email" is required for request on POST /api/users');
    });

    it("should build a message for a 'query' type", () => {
        const error = new ParamRequiredError(action, {type: "query", name: "page"});

        assert.equal(error.message, 'Query parameter "page" is required for request on POST /api/users');
    });

    it("should build a message for a 'header' type", () => {
        const error = new ParamRequiredError(action, {type: "header", name: "Authorization"});

        assert.equal(error.message, 'Header "Authorization" is required for request on POST /api/users');
    });

    it("should build a message for a 'file' type", () => {
        const error = new ParamRequiredError(action, {type: "file", name: "avatar"});

        assert.equal(error.message, 'Uploaded file "avatar" is required for request on POST /api/users');
    });

    it("should build a message for a 'files' type", () => {
        const error = new ParamRequiredError(action, {type: "files", name: "attachments"});

        assert.equal(error.message, 'Uploaded files "attachments" are required for request on POST /api/users');
    });

    it("should build a message for a 'session' type", () => {
        const error = new ParamRequiredError(action, {type: "session", name: ""});

        assert.equal(error.message, "Session is required for request on POST /api/users");
    });

    it("should build a message for a 'cookie' type", () => {
        const error = new ParamRequiredError(action, {type: "cookie", name: ""});

        assert.equal(error.message, "Cookie is required for request on POST /api/users");
    });

    it("should fall back to a generic message for an unknown type", () => {
        const error = new ParamRequiredError(action, {type: "unknown-type", name: "x"});

        assert.equal(error.message, "Parameter is required for request on POST /api/users");
    });

    it("should carry the 400 httpCode inherited from BadRequestError", () => {
        const error = new ParamRequiredError(action, {type: "param", name: "id"});

        assert.equal(error.httpCode, 400);
        assert.equal(error.name, "ParamRequiredError");
    });

    it("should be an instanceof Error, HttpError, BadRequestError and ParamRequiredError", () => {
        const error = new ParamRequiredError(action, {type: "param", name: "id"});

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof BadRequestError);
        assert.ok(error instanceof ParamRequiredError);
    });
});

describe("ParameterParseJsonError", () => {
    it("should build the message including the JSON-stringified value", () => {
        const error = new ParameterParseJsonError("payload", "{not-json");

        assert.equal(
            error.message,
            'Given parameter payload is invalid. Value ("{not-json") cannot be parsed into JSON.',
        );
        assert.equal(error.name, "ParameterParseJsonError");
    });

    it("should carry the 400 httpCode inherited from BadRequestError", () => {
        const error = new ParameterParseJsonError("payload", "{not-json");

        assert.equal(error.httpCode, 400);
    });

    it("should be an instanceof Error, HttpError, BadRequestError and ParameterParseJsonError", () => {
        const error = new ParameterParseJsonError("payload", "{not-json");

        assert.ok(error instanceof Error);
        assert.ok(error instanceof HttpError);
        assert.ok(error instanceof BadRequestError);
        assert.ok(error instanceof ParameterParseJsonError);
    });

    it("should have a stack trace", () => {
        const error = new ParameterParseJsonError("payload", "{not-json");

        assert.equal(typeof error.stack, "string");
        assert.ok(error.stack!.length > 0);
    });
});
