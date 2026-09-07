import {mock} from "node:test";
import {NodeBootDriver} from "../../src/core";

/**
 * Minimal fake driver satisfying the `NodeBootDriver` abstract contract, so `NodeBootEngine`
 * and `NodeBootToolkit` can be exercised without booting any real HTTP server framework.
 *
 * Every method is a fresh `mock.fn()` so call assertions never leak between tests.
 */
export function createFakeDriver(overrides: Record<string, any> = {}) {
    const driver: any = {
        app: {fake: true},
        useClassTransformer: true,
        enableValidation: true,
        developmentMode: true,
        routePrefix: "",
        validationOptions: {},
        initialize: mock.fn(),
        registerMiddleware: mock.fn(),
        registerAction: mock.fn(),
        registerRoutes: mock.fn(),
        getParamFromRequest: mock.fn(() => undefined),
        handleError: mock.fn(async (error: any) => ({error})),
        handleSuccess: mock.fn((result: any) => result),
        ...overrides,
    };
    return driver as NodeBootDriver<any> & Record<string, any>;
}
