import "reflect-metadata";
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Property} from "@nodeboot/core";
import {Model} from "../src";
import {parseDataClasses} from "../src";

describe("dataClassParser - parseDataClasses", () => {
    test("parses primitive types and date/datetime formats", () => {
        @Model()
        class PrimitiveModel {
            @Property({type: "string", description: "A string field", example: "hello"})
            stringField: string;

            @Property({type: "number", description: "A number field"})
            numberField: number;

            @Property({type: "integer", description: "An integer field"})
            intField: number;

            @Property({type: "boolean", description: "A boolean field"})
            boolField: boolean;

            @Property({type: "date", description: "A date field"})
            dateField: Date;

            @Property({type: "date", format: "date-time", description: "A datetime field"})
            datetimeField: Date;

            @Property({type: "date", format: "date-time", description: "A timestamp field"})
            timestampField: Date;
        }

        const schemas = parseDataClasses([PrimitiveModel]);
        const schema = schemas["PrimitiveModel"];

        assert.ok(schema);
        assert.equal(schema.type, "object");
        assert.equal((schema.properties as any).stringField.type, "string");
        assert.equal((schema.properties as any).stringField.example, "hello");
        assert.equal((schema.properties as any).numberField.type, "number");
        assert.equal((schema.properties as any).intField.type, "integer");
        assert.equal((schema.properties as any).boolField.type, "boolean");
        assert.equal((schema.properties as any).dateField.type, "string");
        assert.equal((schema.properties as any).dateField.format, "date-time");
        assert.equal((schema.properties as any).datetimeField.format, "date-time");
        assert.equal((schema.properties as any).timestampField.format, "date-time");
    });

    test("parses enum, nullable, and required properties", () => {
        enum Status {
            ACTIVE = "ACTIVE",
            INACTIVE = "INACTIVE",
        }

        @Model()
        class StatusModel {
            @Property({required: true, enum: Object.values(Status)})
            status: string;

            @Property({required: false, nullable: true})
            optionalNote?: string;
        }

        const schemas = parseDataClasses([StatusModel]);
        const schema = schemas["StatusModel"];
        assert.ok(schema);

        assert.deepEqual(schema.required, ["status"]);
        assert.deepEqual((schema.properties as any).status.enum, ["ACTIVE", "INACTIVE"]);
        assert.equal((schema.properties as any).optionalNote.nullable, true);
    });

    test("parses oneOf, anyOf, allOf properties", () => {
        @Model()
        class TypeA {
            @Property() a: string;
        }

        @Model()
        class TypeB {
            @Property() b: string;
        }

        @Model()
        class CompositeModel {
            @Property({oneOf: [TypeA, TypeB]})
            oneOfField: any;

            @Property({anyOf: ["string", "number"]})
            anyOfField: any;

            @Property({allOf: [TypeA, TypeB]})
            allOfField: any;
        }

        const schemas = parseDataClasses([CompositeModel]);
        const schema = schemas["CompositeModel"];
        assert.ok(schema);

        assert.deepEqual((schema.properties as any).oneOfField.oneOf, [
            {$ref: "#/components/schemas/TypeA"},
            {$ref: "#/components/schemas/TypeB"},
        ]);
        assert.deepEqual((schema.properties as any).anyOfField.anyOf, [{type: "string"}, {type: "number"}]);
        assert.deepEqual((schema.properties as any).allOfField.allOf, [
            {$ref: "#/components/schemas/TypeA"},
            {$ref: "#/components/schemas/TypeB"},
        ]);
    });

    test("parses array properties with model refs and primitive types", () => {
        @Model()
        class TagModel {
            @Property() name: string;
        }

        @Model()
        class ContainerModel {
            @Property({type: "array", itemType: TagModel})
            tags: TagModel[];

            @Property({type: "array", itemType: "string"})
            keywords: string[];

            @Property({type: "array"})
            untypedList: any[];
        }

        const schemas = parseDataClasses([ContainerModel]);
        const schema = schemas["ContainerModel"];
        assert.ok(schema);

        const tags = (schema.properties as any).tags;
        assert.equal(tags.type, "array");
        assert.equal(tags.items?.$ref, "#/components/schemas/TagModel");

        const keywords = (schema.properties as any).keywords;
        assert.equal(keywords.type, "array");
        assert.equal(keywords.items?.type, "string");

        const untypedList = (schema.properties as any).untypedList;
        assert.equal(untypedList.type, "array");
        assert.equal(untypedList.items?.type, "object");
    });

    test("parses nested class references and inherited model properties", () => {
        @Model()
        class BaseEntity {
            @Property({description: "Entity ID"})
            id: number;

            @Property({type: "date"})
            createdAt: Date;
        }

        @Model()
        class Address {
            @Property() street: string;
        }

        @Model()
        class ExtendedUser extends BaseEntity {
            @Property({description: "User name"})
            name: string;

            @Property({type: Address})
            address: Address;
        }

        const schemas = parseDataClasses([ExtendedUser]);
        const schema = schemas["ExtendedUser"];
        assert.ok(schema);

        assert.ok((schema.properties as any).id);
        assert.ok((schema.properties as any).createdAt);
        assert.ok((schema.properties as any).name);
        assert.equal((schema.properties as any).address?.$ref, "#/components/schemas/Address");
    });

    test("resolves generic model bindings", () => {
        @Model()
        class Item {
            @Property() title: string;
        }

        @Model({T: Item})
        class PageModel {
            @Property() page: number;
            @Property({type: "array", itemType: "T"}) items: Item[];
        }

        const schemas = parseDataClasses([PageModel]);
        const schema = schemas["PageModel"];
        assert.ok(schema);

        const items = (schema.properties as any).items;
        assert.equal(items.type, "array");
        assert.equal(items.items?.$ref, "#/components/schemas/Item");
    });
});
