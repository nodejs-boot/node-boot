import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {MetadataService} from "../src/service/MetadataService";

describe("MetadataService", () => {
    test("returns list of available actuator endpoints", () => {
        const service = new MetadataService();
        const result = service.getActuatorEndpoints();

        assert.equal(result.context, "Available actuator endpoints");
        assert.ok(Array.isArray(result.endpoints));
        assert.ok(result.endpoints.includes("/actuator/info"));
        assert.ok(result.endpoints.includes("/actuator/health"));
        assert.ok(result.endpoints.includes("/actuator/metrics"));
        assert.ok(result.endpoints.includes("/actuator/prometheus"));
    });

    test("returns controllers, interceptors, and middlewares metadata", () => {
        const service = new MetadataService();

        const controllers = service.getControllers();
        assert.ok(Array.isArray(controllers));

        const interceptors = service.getInterceptors();
        assert.ok(Array.isArray(interceptors));

        const middlewares = service.getMiddlewares();
        assert.ok(Array.isArray(middlewares));
    });
});
