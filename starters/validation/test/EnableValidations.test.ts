import {describe, it} from "node:test";
import assert from "node:assert/strict";

import {EnableValidations} from "../src";

describe("EnableValidations decorator", () => {
    it("returns a class decorator that can be applied without throwing", () => {
        assert.doesNotThrow(() => {
            @EnableValidations()
            class SampleApp {}
            void SampleApp;
        });
    });

    it("instantiates a ValidationsConfiguration when applied", () => {
        // ValidationsConfiguration's @Bean-decorated method only runs its logic once discovered
        // and invoked by the framework's BeansConfigurationAdapter, so applying the decorator here
        // only exercises construction, not the bean factory logic (covered in ValidationsConfiguration.test.ts).
        assert.doesNotThrow(() => EnableValidations()(class {} as any));
    });
});
