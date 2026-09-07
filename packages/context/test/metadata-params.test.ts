import "reflect-metadata";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {ParamMetadata} from "../src/metadata/ParamMetadata";
import {ParamMetadataArgs} from "../src/metadata/args";

class DummyType {}

class SampleController {
    withReflectedTypes(_a: string, _b: number) {
        return undefined;
    }

    withNoMetadata(_a: any) {
        return undefined;
    }
}

function baseArgs(overrides: Partial<ParamMetadataArgs> = {}): ParamMetadataArgs {
    return {
        object: SampleController.prototype,
        method: "withNoMetadata",
        index: 0,
        type: "param",
        name: "id",
        parse: false,
        ...overrides,
    };
}

describe("ParamMetadata construction", () => {
    it("copies plain fields from args and derives target from object.constructor", () => {
        const transform = async (_v?: any) => _v;
        const param = new ParamMetadata(
            {} as any,
            baseArgs({
                method: "withNoMetadata",
                index: 2,
                type: "query",
                name: "search",
                parse: true,
                required: true,
                transform: transform as any,
                classTransform: {excludeExtraneousValues: true},
                validate: true,
                isArray: true,
                extraOptions: {foo: "bar"},
            }),
        );

        assert.equal(param.target, SampleController);
        assert.equal(param.method, "withNoMetadata");
        assert.equal(param.index, 2);
        assert.equal(param.type, "query");
        assert.equal(param.name, "search");
        assert.equal(param.parse, true);
        assert.equal(param.required, true);
        assert.equal(param.transform, transform);
        assert.deepEqual(param.classTransform, {excludeExtraneousValues: true});
        assert.equal(param.validate, true);
        assert.equal(param.isArray, true);
        assert.deepEqual(param.extraOptions, {foo: "bar"});
    });

    it("uses explicitType when provided, without consulting reflected design:paramtypes", () => {
        const param = new ParamMetadata({} as any, baseArgs({explicitType: DummyType}));
        assert.equal(param.targetType, DummyType);
        assert.equal(param.targetName, "dummytype");
        assert.equal(param.isTargetObject, true);
    });

    it("treats a string explicitType of 'object' as a target object", () => {
        const param = new ParamMetadata({} as any, baseArgs({explicitType: "object"}));
        assert.equal(param.targetType, "object");
        assert.equal(param.targetName, "object");
        assert.equal(param.isTargetObject, true);
    });

    it("treats a string explicitType other than 'object' as not a target object", () => {
        const param = new ParamMetadata({} as any, baseArgs({explicitType: "string"}));
        assert.equal(param.targetType, "string");
        assert.equal(param.targetName, "string");
        assert.equal(param.isTargetObject, false);
    });

    it("resolves targetType from Reflect design:paramtypes when explicitType is not set", () => {
        Reflect.defineMetadata("design:paramtypes", [String, Number], SampleController.prototype, "withReflectedTypes");

        const firstParam = new ParamMetadata({} as any, baseArgs({method: "withReflectedTypes", index: 0, name: "a"}));
        assert.equal(firstParam.targetType, String);
        assert.equal(firstParam.targetName, "string");
        // String is a Function, so per the current implementation this counts as a target object.
        assert.equal(firstParam.isTargetObject, true);

        const secondParam = new ParamMetadata({} as any, baseArgs({method: "withReflectedTypes", index: 1, name: "b"}));
        assert.equal(secondParam.targetType, Number);
        assert.equal(secondParam.targetName, "number");
    });

    it("leaves targetType/targetName/isTargetObject at defaults when no metadata is available", () => {
        const param = new ParamMetadata({} as any, baseArgs({method: "withNoMetadata", index: 0}));
        assert.equal(param.targetType, undefined);
        assert.equal(param.targetName, "");
        assert.equal(param.isTargetObject, false);
    });
});
