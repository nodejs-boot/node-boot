import "reflect-metadata";
import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {NodeBootToolkit} from "@nodeboot/engine";
import {Get} from "../src/decorators/Get";
import {Post} from "../src/decorators/Post";
import {Put} from "../src/decorators/Put";
import {Patch} from "../src/decorators/Patch";
import {Delete} from "../src/decorators/Delete";
import {Head} from "../src/decorators/Head";
import {All} from "../src/decorators/All";
import {Method} from "../src/decorators/Method";

beforeEach(() => {
    NodeBootToolkit.reset();
});

describe("HTTP method decorators", () => {
    describe("@Get", () => {
        it("registers a 'get' action with route and options", () => {
            const options = {something: true};

            class SampleController {
                @Get("/foo", options as any)
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.deepEqual(actions[0], {
                type: "get",
                target: SampleController,
                method: "foo",
                options,
                route: "/foo",
            });
        });

        it("supports being applied without a route", () => {
            class SampleController {
                @Get()
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.route, undefined);
            assert.equal(actions[0]!.options, undefined);
            assert.equal(actions[0]!.type, "get");
            assert.equal(actions[0]!.target, SampleController);
        });

        it("supports a RegExp route", () => {
            const route = /^\/foo$/;

            class SampleController {
                @Get(route)
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions[0]!.route, route);
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Post", () => {
        it("registers a 'post' action", () => {
            class SampleController {
                @Post("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "post");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.method, "foo");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Put", () => {
        it("registers a 'put' action", () => {
            class SampleController {
                @Put("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "put");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Patch", () => {
        it("registers a 'patch' action", () => {
            class SampleController {
                @Patch("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "patch");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Delete", () => {
        it("registers a 'delete' action", () => {
            class SampleController {
                @Delete("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "delete");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Head", () => {
        it("registers a 'head' action", () => {
            class SampleController {
                @Head("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "head");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@All", () => {
        it("registers an 'all' action", () => {
            class SampleController {
                @All("/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "all");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.target, SampleController);
        });

        it("supports being applied without a route", () => {
            class SampleController {
                @All()
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions[0]!.route, undefined);
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("@Method", () => {
        it("registers an action with the given ActionType as type", () => {
            class SampleController {
                @Method("options", "/foo")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 1);
            assert.equal(actions[0]!.type, "options");
            assert.equal(actions[0]!.route, "/foo");
            assert.equal(actions[0]!.method, "foo");
            assert.equal(actions[0]!.target, SampleController);
        });

        it("supports arbitrary custom HTTP verbs matching the ActionType", () => {
            class SampleController {
                @Method("connect")
                foo() {
                    return "foo";
                }
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions[0]!.type, "connect");
            assert.equal(actions[0]!.target, SampleController);
        });
    });

    describe("multiple actions on the same class", () => {
        it("accumulates all decorated actions independently", () => {
            class SampleController {
                @Get("/foo")
                getFoo() {}

                @Post("/foo")
                postFoo() {}

                @Delete("/foo/:id")
                deleteFoo() {}
            }

            const actions = NodeBootToolkit.getMetadataArgsStorage().actions.filter(
                action => action.target === SampleController,
            );
            assert.equal(actions.length, 3);
            const types = actions.map(action => action.type).sort();
            assert.deepEqual(types, ["delete", "get", "post"]);
        });
    });

    describe("state isolation via NodeBootToolkit.reset()", () => {
        it("clears the actions array between tests", () => {
            // This test relies on beforeEach already having reset storage.
            const actions = NodeBootToolkit.getMetadataArgsStorage().actions;
            assert.equal(actions.length, 0);
        });
    });
});
