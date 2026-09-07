import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {getOpenAPIMetadata, Model, ResponseSchema} from "../src";
import {IRoute} from "../src/types";

describe("ResponseSchema decorator", () => {
    const mockRoute: IRoute = {
        action: {type: "get", method: "getUser", target: class {}} as any,
        controller: {type: "json", route: "/users", target: class {}} as any,
        options: {},
        params: [],
        responseHandlers: [],
    };

    test("attaches response schema for a model class and auto-registers @Model", () => {
        class ResponseModel {
            id: number;
        }

        class TestController {
            @ResponseSchema(ResponseModel, {description: "User response"})
            getUser() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "getUser");
        assert.equal(metadata.length, 1);
        assert.equal(typeof metadata[0], "function");

        const modifier = metadata[0] as Function;
        const initialOperation: any = {responses: {}};
        const result = modifier(initialOperation, mockRoute);

        assert.ok(result.responses["200"]);
        assert.equal(result.responses["200"].description, "User response");
        assert.deepEqual(result.responses["200"].content["application/json"].schema, {
            $ref: "#/components/schemas/ResponseModel",
        });
        assert.equal(Reflect.getMetadata("node-boot:model", ResponseModel.prototype), true);
    });

    test("attaches response schema with isArray: true", () => {
        @Model()
        class ItemModel {}

        class TestController {
            @ResponseSchema(ItemModel, {isArray: true, statusCode: 200, contentType: "application/json"})
            getItems() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "getItems");
        const modifier = metadata[0] as Function;
        const result = modifier({responses: {}}, mockRoute);

        assert.deepEqual(result.responses["200"].content["application/json"].schema, {
            type: "array",
            items: {$ref: "#/components/schemas/ItemModel"},
        });
    });

    test("handles primitive types string, number, integer, boolean, object, array", () => {
        const types = ["string", "number", "integer", "boolean", "object", "array", "unknownFallback"];

        for (const t of types) {
            class ControllerWithPrimitive {
                @ResponseSchema(t)
                handler() {}
            }

            const metadata = getOpenAPIMetadata(ControllerWithPrimitive.prototype, "handler");
            const modifier = metadata[0] as Function;
            const result = modifier({responses: {}}, mockRoute);

            assert.ok(result.responses["200"]);
            const schema = result.responses["200"].content["application/json"].schema;
            if (t === "array") {
                assert.deepEqual(schema, {type: "array", items: {}});
            } else if (t === "unknownFallback") {
                assert.deepEqual(schema, {type: "string"});
            } else {
                assert.deepEqual(schema, {type: t});
            }
        }
    });

    test("handles primitive type array with isArray: true", () => {
        class TestController {
            @ResponseSchema("string", {isArray: true})
            getStrings() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "getStrings");
        const modifier = metadata[0] as Function;
        const result = modifier({responses: {}}, mockRoute);

        assert.deepEqual(result.responses["200"].content["application/json"].schema, {
            type: "array",
            items: {type: "string"},
        });
    });

    test("merges multiple schemas into oneOf when multiple schemas apply to the same status code", () => {
        @Model()
        class SchemaA {}

        @Model()
        class SchemaB {}

        @Model()
        class SchemaC {}

        class TestController {
            @ResponseSchema(SchemaA)
            @ResponseSchema(SchemaB)
            @ResponseSchema(SchemaC)
            getMultiple() {}
        }

        const metadata = getOpenAPIMetadata(TestController.prototype, "getMultiple");
        assert.equal(metadata.length, 3);

        let op: any = {responses: {}};
        for (const fn of metadata) {
            op = (fn as Function)(op, mockRoute);
        }

        const schema = op.responses["200"].content["application/json"].schema;
        assert.ok(schema.oneOf);
        assert.equal(schema.oneOf.length, 3);
        assert.deepEqual(schema.oneOf[0], {$ref: "#/components/schemas/SchemaA"});
        assert.deepEqual(schema.oneOf[1], {$ref: "#/components/schemas/SchemaB"});
        assert.deepEqual(schema.oneOf[2], {$ref: "#/components/schemas/SchemaC"});
    });
});
