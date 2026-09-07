import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {NodeBootToolkit} from "@nodeboot/engine";
import {Model} from "../src";

describe("Model decorator", () => {
    test("registers model target into metadata args storage and defines metadata", () => {
        @Model()
        class SampleItem {}

        assert.equal(Reflect.getMetadata("node-boot:model", SampleItem.prototype), true);
        const registered = NodeBootToolkit.getMetadataArgsStorage().models.some(m => m.target === SampleItem);
        assert.equal(registered, true);
    });

    test("registers generic type bindings metadata when provided", () => {
        class InnerItem {}

        @Model({T: InnerItem})
        class GenericContainer {}

        const bindings = Reflect.getMetadata("node-boot:model:generic:bindings", GenericContainer.prototype);
        assert.deepEqual(bindings, {T: InnerItem});
    });
});
