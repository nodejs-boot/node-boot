import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";

import {NodeBootToolkit} from "@nodeboot/engine";
import {Body} from "../src/decorators/Body";
import {BodyParam} from "../src/decorators/BodyParam";
import {Param} from "../src/decorators/Param";
import {Params} from "../src/decorators/Params";
import {QueryParam} from "../src/decorators/QueryParam";
import {QueryParams} from "../src/decorators/QueryParams";
import {HeaderParam} from "../src/decorators/HeaderParam";
import {HeaderParams} from "../src/decorators/HeaderParams";
import {CookieParam} from "../src/decorators/CookieParam";
import {CookieParams} from "../src/decorators/CookieParams";
import {SessionParam} from "../src/decorators/SessionParam";
import {Session} from "../src/decorators/Session";
import {State} from "../src/decorators/State";
import {UploadedFile} from "../src/decorators/UploadedFile";
import {UploadedFiles} from "../src/decorators/UploadedFiles";
import {Ctx} from "../src/decorators/Ctx";
import {Req} from "../src/decorators/Req";
import {Res} from "../src/decorators/Res";

describe("Parameter decorators", () => {
    beforeEach(() => {
        NodeBootToolkit.reset();
    });

    describe("@Body", () => {
        it("registers a body param entry with defaults when no options are provided", () => {
            class TestController {
                action(@Body() _body: any) {}
            }

            const params = NodeBootToolkit.getMetadataArgsStorage().params;
            assert.equal(params.length, 1);

            const entry = params[0]!;
            assert.equal(entry.type, "body");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.validate, undefined);
            assert.equal(entry.explicitType, undefined);
            assert.equal(entry.extraOptions, undefined);
        });

        it("registers a body param entry honoring provided options", () => {
            class CustomBody {}
            const transformOptions = {excludeExtraneousValues: true};
            const extraOptions = {limit: "1mb"};

            class TestController {
                action(
                    @Body({
                        required: true,
                        transform: transformOptions,
                        validate: true,
                        type: CustomBody,
                        options: extraOptions,
                    })
                    _body: CustomBody,
                ) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, true);
            assert.equal(entry.classTransform, transformOptions);
            assert.equal(entry.validate, true);
            assert.equal(entry.explicitType, CustomBody);
            assert.equal(entry.extraOptions, extraOptions);
        });
    });

    describe("@BodyParam", () => {
        it("registers a body-param entry with defaults when only a name is provided", () => {
            class TestController {
                action(@BodyParam("email") _email: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "body-param");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "email");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.explicitType, undefined);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.validate, undefined);
        });

        it("registers a body-param entry honoring provided options", () => {
            class TestController {
                action(@BodyParam("age", {parse: true, required: true, type: Number, validate: true}) _age: number) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.name, "age");
            assert.equal(entry.parse, true);
            assert.equal(entry.required, true);
            assert.equal(entry.explicitType, Number);
            assert.equal(entry.validate, true);
        });
    });

    describe("@Param", () => {
        it("registers a route param entry that is always required and never parsed", () => {
            class TestController {
                action(@Param("id") _id: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "param");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "id");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, true);
            assert.equal(entry.classTransform, undefined);
        });
    });

    describe("@Params", () => {
        it("registers a params entry with defaults when no options are provided", () => {
            class TestController {
                action(@Params() _params: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "params");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.explicitType, undefined);
            assert.equal(entry.validate, undefined);
        });

        it("registers a params entry honoring provided options", () => {
            class TestController {
                action(@Params({parse: true, required: true}) _params: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.parse, true);
            assert.equal(entry.required, true);
        });
    });

    describe("@QueryParam", () => {
        it("registers a query param entry with defaults when only a name is provided", () => {
            class TestController {
                action(@QueryParam("q") _q: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "query");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "q");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.explicitType, undefined);
            assert.equal(entry.validate, undefined);
            assert.equal(entry.isArray, false);
        });

        it("registers a query param entry honoring provided options including isArray", () => {
            class TestController {
                action(
                    @QueryParam("tags", {isArray: true, parse: true, required: true, type: String}) _tags: string[],
                ) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.name, "tags");
            assert.equal(entry.isArray, true);
            assert.equal(entry.parse, true);
            assert.equal(entry.required, true);
            assert.equal(entry.explicitType, String);
        });
    });

    describe("@QueryParams", () => {
        it("registers a queries entry with defaults and an empty name", () => {
            class TestController {
                action(@QueryParams() _query: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "queries");
            assert.equal(entry.name, "");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });

        it("registers a queries entry honoring provided options", () => {
            class TestController {
                action(@QueryParams({parse: true, required: true}) _query: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.parse, true);
            assert.equal(entry.required, true);
        });
    });

    describe("@HeaderParam", () => {
        it("registers a header param entry with defaults when only a name is provided", () => {
            class TestController {
                action(@HeaderParam("x-request-id") _id: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "header");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "x-request-id");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });

        it("registers a header param entry honoring provided options", () => {
            class TestController {
                action(@HeaderParam("authorization", {required: true, parse: true}) _auth: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.name, "authorization");
            assert.equal(entry.required, true);
            assert.equal(entry.parse, true);
        });
    });

    describe("@HeaderParams", () => {
        it("registers a headers entry that is never parsed and never required", () => {
            class TestController {
                action(@HeaderParams() _headers: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "headers");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });
    });

    describe("@CookieParam", () => {
        it("registers a cookie param entry with defaults when only a name is provided", () => {
            class TestController {
                action(@CookieParam("session_id") _sessionId: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "cookie");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "session_id");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });

        it("registers a cookie param entry honoring provided options", () => {
            class TestController {
                action(@CookieParam("session_id", {required: true, parse: true}) _sessionId: string) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, true);
            assert.equal(entry.parse, true);
        });
    });

    describe("@CookieParams", () => {
        it("registers a cookies entry that is never parsed and never required", () => {
            class TestController {
                action(@CookieParams() _cookies: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "cookies");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });
    });

    describe("@SessionParam", () => {
        it("registers a session-param entry defaulting required/validate to false", () => {
            class TestController {
                action(@SessionParam("user") _user: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "session-param");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "user");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.validate, false);
        });

        it("registers a session-param entry honoring provided options", () => {
            const transformOptions = {};
            class TestController {
                action(
                    @SessionParam("user", {required: true, transform: transformOptions, validate: true}) _user: any,
                ) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, true);
            assert.equal(entry.classTransform, transformOptions);
            assert.equal(entry.validate, true);
        });
    });

    describe("@Session", () => {
        it("registers a session entry defaulting required to true and validate to false", () => {
            class TestController {
                action(@Session() _session: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "session");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, true);
            assert.equal(entry.classTransform, undefined);
            assert.equal(entry.validate, false);
        });

        it("registers a session entry honoring provided options, including required: false", () => {
            const transformOptions = {};
            class TestController {
                action(@Session({required: false, transform: transformOptions, validate: true}) _session: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, false);
            assert.equal(entry.classTransform, transformOptions);
            assert.equal(entry.validate, true);
        });
    });

    describe("@State", () => {
        it("registers a state entry that is always required and never parsed, with no name", () => {
            class TestController {
                action(@State() _state: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "state");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, undefined);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, true);
            assert.equal(entry.classTransform, undefined);
        });

        it("registers a state entry with the provided object name", () => {
            class TestController {
                action(@State("cart") _cart: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.name, "cart");
        });
    });

    describe("@UploadedFile", () => {
        it("registers a file entry with defaults when only a name is provided", () => {
            class TestController {
                action(@UploadedFile("avatar") _avatar: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "file");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "avatar");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.extraOptions, undefined);
        });

        it("registers a file entry honoring provided options", () => {
            const uploadOptions = {maxSize: 1_000_000};
            class TestController {
                action(@UploadedFile("avatar", {required: true, options: uploadOptions}) _avatar: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, true);
            assert.equal(entry.extraOptions, uploadOptions);
        });
    });

    describe("@UploadedFiles", () => {
        it("registers a files entry with defaults when only a name is provided", () => {
            class TestController {
                action(@UploadedFiles("attachments") _attachments: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "files");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.name, "attachments");
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
            assert.equal(entry.extraOptions, undefined);
        });

        it("registers a files entry honoring provided options", () => {
            const uploadOptions = {maxCount: 5};
            class TestController {
                action(@UploadedFiles("attachments", {required: true, options: uploadOptions}) _attachments: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.required, true);
            assert.equal(entry.extraOptions, uploadOptions);
        });
    });

    describe("@Ctx", () => {
        it("registers a context entry that is never parsed and never required", () => {
            class TestController {
                action(@Ctx() _ctx: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "context");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });
    });

    describe("@Req", () => {
        it("registers a request entry that is never parsed and never required", () => {
            class TestController {
                action(@Req() _req: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "request");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });
    });

    describe("@Res", () => {
        it("registers a response entry that is never parsed and never required", () => {
            class TestController {
                action(@Res() _res: any) {}
            }

            const entry = NodeBootToolkit.getMetadataArgsStorage().params[0]!;
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.type, "response");
            assert.equal(entry.object, TestController.prototype);
            assert.equal(entry.method, "action");
            assert.equal(entry.index, 0);
            assert.equal(entry.parse, false);
            assert.equal(entry.required, false);
        });
    });

    describe("composed parameter decorators on a single method", () => {
        it("records a distinct entry with the correct index for each decorated parameter", () => {
            class TestController {
                action(@Param("id") _id: string, @Body() _body: any) {}
            }

            const params = NodeBootToolkit.getMetadataArgsStorage().params;
            assert.equal(params.length, 2);

            const paramEntry = params.find(p => p.type === "param")!;
            const bodyEntry = params.find(p => p.type === "body")!;

            assert.equal(paramEntry.index, 0);
            assert.equal(paramEntry.name, "id");
            assert.equal(paramEntry.object, TestController.prototype);
            assert.equal(paramEntry.method, "action");

            assert.equal(bodyEntry.index, 1);
            assert.equal(bodyEntry.object, TestController.prototype);
            assert.equal(bodyEntry.method, "action");
        });
    });
});
