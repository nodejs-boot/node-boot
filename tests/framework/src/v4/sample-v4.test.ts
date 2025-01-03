import {NotService, ServiceA, ServiceN, TestApp} from "../app";
import {useNodeBoot} from "./frameworkV4";
import {useAppConfig, useService} from "./static.hooks";
import {expect} from "@jest/globals";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Test - NodeBoot Test V4", () => {
    useNodeBoot(TestApp, ({useAppContext, useMock, useConfig, useAddress, useEnv}) => {
        // Register mocks before services are injected
        useMock(ServiceA, {
            doSomething: () => "Mocked ServiceA result",
        });

        useEnv({NODE_ENV: "test", FEATURE_FLAG: "true"});

        useConfig({
            app: {
                port: 20000,
            },
        });

        useAddress(address => {
            // do something with the server address
            console.log("SERVER ADDRESS:", address);
        });

        useAppContext(appContext => {
            expect(appContext.appOptions).toBeDefined();
            expect(appContext.config).toBeDefined();
            expect(appContext.logger).toBeDefined();
        });
    });

    it("should use mocked and real service instances", () => {
        const serviceA = useService(ServiceA);
        const serviceN = useService(ServiceN);
        expect(serviceA.doSomething()).toBe("Mocked ServiceA result");
        expect(serviceN.doSomethingElse()).toBe("Real ServiceN result");
    });

    it("should fail when not a service", () => {
        expect(() => useService(NotService)).toThrow("The class NotService is not decorated with @Service.");
    });

    it("should retrieve app configs", () => {
        const config = useAppConfig();
        expect(config).toBeDefined();
        expect(config.getNumber("app.port")).toBe(20000);
    });

    it("should retrieve env value", () => {
        expect(process.env["NODE_ENV"]).toBe("test");
        expect(process.env["FEATURE_FLAG"]).toBe("true");
    });
});
