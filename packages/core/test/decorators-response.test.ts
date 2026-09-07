import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";

import {NodeBootToolkit} from "@nodeboot/engine";
import {Header} from "../src/decorators/Header";
import {ContentType} from "../src/decorators/ContentType";
import {HttpCode} from "../src/decorators/HttpCode";
import {Location} from "../src/decorators/Location";
import {OnNull} from "../src/decorators/OnNull";
import {OnUndefined} from "../src/decorators/OnUndefined";
import {Redirect} from "../src/decorators/Redirect";
import {Render} from "../src/decorators/Render";
import {UseBefore} from "../src/decorators/UseBefore";
import {UseAfter} from "../src/decorators/UseAfter";
import {UseInterceptor} from "../src/decorators/UseInterceptor";

describe("Response-shaping decorators", () => {
    beforeEach(() => {
        NodeBootToolkit.reset();
    });

    describe("@Header", () => {
        it("registers a header response handler with name and value", () => {
            class TestController {
                @Header("X-Custom", "custom-value")
                action() {}
            }

            const handlers = NodeBootToolkit.getMetadataArgsStorage().responseHandlers;
            assert.equal(handlers.length, 1);

            const entry = handlers[0]!;
            assert.equal(entry.type, "header");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, "X-Custom");
            assert.equal(entry.secondaryValue, "custom-value");
        });
    });

    describe("@ContentType", () => {
        it("registers a content-type response handler", () => {
            class TestController {
                @ContentType("application/json")
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "content-type");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, "application/json");
        });
    });

    describe("@HttpCode", () => {
        it("registers a success-code response handler", () => {
            class TestController {
                @HttpCode(201)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "success-code");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, 201);
        });
    });

    describe("@Location", () => {
        it("registers a location response handler", () => {
            class TestController {
                @Location("/new-resource")
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "location");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, "/new-resource");
        });
    });

    describe("@OnNull", () => {
        it("registers an on-null response handler with a numeric status code", () => {
            class TestController {
                @OnNull(404)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "on-null");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, 404);
        });

        it("registers an on-null response handler with an error class", () => {
            class NotFoundError extends Error {}

            class TestController {
                @OnNull(NotFoundError)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "on-null");
            assert.equal(entry.target, TestController);
            assert.equal(entry.value, NotFoundError);
        });
    });

    describe("@OnUndefined", () => {
        it("registers an on-undefined response handler with a numeric status code", () => {
            class TestController {
                @OnUndefined(400)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "on-undefined");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, 400);
        });

        it("registers an on-undefined response handler with an error class", () => {
            class BadRequestError extends Error {}

            class TestController {
                @OnUndefined(BadRequestError)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "on-undefined");
            assert.equal(entry.target, TestController);
            assert.equal(entry.value, BadRequestError);
        });
    });

    describe("@Redirect", () => {
        it("registers a redirect response handler", () => {
            class TestController {
                @Redirect("/login")
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "redirect");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, "/login");
        });
    });

    describe("@Render", () => {
        it("registers a rendered-template response handler", () => {
            class TestController {
                @Render("index.ejs")
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().responseHandlers[0]!;
            assert.equal(entry.type, "rendered-template");
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.value, "index.ejs");
        });
    });

    describe("@UseBefore", () => {
        it("registers a 'use' entry per middleware when applied to a controller action", () => {
            function middlewareOne() {}
            function middlewareTwo() {}

            class TestController {
                @UseBefore(middlewareOne, middlewareTwo)
                action() {}
            }

            const uses = NodeBootToolkit.getMetadataArgsStorage().uses;
            assert.equal(uses.length, 2);

            assert.equal(uses[0]!.target, TestController);
            assert.equal(uses[0]!.method, "action");
            assert.equal(uses[0]!.middleware, middlewareOne);
            assert.equal(uses[0]!.afterAction, false);

            assert.equal(uses[1]!.target, TestController);
            assert.equal(uses[1]!.method, "action");
            assert.equal(uses[1]!.middleware, middlewareTwo);
            assert.equal(uses[1]!.afterAction, false);
        });

        it("registers a 'use' entry with an undefined method and the class as target when applied at class level", () => {
            function middleware() {}

            @UseBefore(middleware)
            class TestController {}

            const entry = NodeBootToolkit.getMetadataArgsStorage().uses[0]!;
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, undefined);
            assert.equal(entry.middleware, middleware);
            assert.equal(entry.afterAction, false);
        });
    });

    describe("@UseAfter", () => {
        it("registers a 'use' entry with afterAction true when applied to a controller action", () => {
            function middleware() {}

            class TestController {
                @UseAfter(middleware)
                action() {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().uses[0]!;
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, "action");
            assert.equal(entry.middleware, middleware);
            assert.equal(entry.afterAction, true);
        });

        it("registers a 'use' entry with an undefined method and the class as target when applied at class level", () => {
            function middleware() {}

            @UseAfter(middleware)
            class TestController {}

            const entry = NodeBootToolkit.getMetadataArgsStorage().uses[0]!;
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, undefined);
            assert.equal(entry.middleware, middleware);
            assert.equal(entry.afterAction, true);
        });
    });

    describe("@UseInterceptor", () => {
        it("registers a 'useInterceptor' entry per interceptor when applied to a controller action", () => {
            function interceptorOne() {}
            function interceptorTwo() {}

            class TestController {
                @UseInterceptor(interceptorOne, interceptorTwo)
                action() {}
            }

            const useInterceptors = NodeBootToolkit.getMetadataArgsStorage().useInterceptors;
            assert.equal(useInterceptors.length, 2);

            assert.equal(useInterceptors[0]!.target, TestController);
            assert.equal(useInterceptors[0]!.method, "action");
            assert.equal(useInterceptors[0]!.interceptor, interceptorOne);

            assert.equal(useInterceptors[1]!.target, TestController);
            assert.equal(useInterceptors[1]!.method, "action");
            assert.equal(useInterceptors[1]!.interceptor, interceptorTwo);
        });

        it("registers a 'useInterceptor' entry with an undefined method and the class as target when applied at class level", () => {
            function interceptor() {}

            @UseInterceptor(interceptor)
            class TestController {}

            const entry = NodeBootToolkit.getMetadataArgsStorage().useInterceptors[0]!;
            assert.equal(entry.target, TestController);
            assert.equal(entry.method, undefined);
            assert.equal(entry.interceptor, interceptor);
        });
    });
});
