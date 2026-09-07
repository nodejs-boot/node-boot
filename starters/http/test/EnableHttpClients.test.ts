import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext} from "@nodeboot/context";
import {EnableHttpClients, HTTP_CLIENT_FEATURE} from "../src";

describe("EnableHttpClients decorator", () => {
    let originalFeatureFlag: boolean | undefined;

    beforeEach(() => {
        originalFeatureFlag = ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE];
        delete ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE];
    });

    afterEach(() => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = originalFeatureFlag;
    });

    it("sets the HTTP client feature flag on the ApplicationContext", () => {
        EnableHttpClients()(class {} as any);

        assert.equal(ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE], true);
    });
});
