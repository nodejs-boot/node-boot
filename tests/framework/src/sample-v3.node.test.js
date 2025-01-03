import {ServiceA, ServiceN, TestApp} from "./app";
import {useNodeBoot, useService} from "./framework-nodeTest";
import {describe, test} from "node:test";
import assert from "node:assert";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Test - NodeBoot Test V3", () => {
    useNodeBoot(TestApp, ({useMock}) => {
        // Register mocks before services are injected
        useMock(ServiceA, {
            doSomething: () => "Mocked ServiceA result",
        });
    });

    test("should use mocked and real service instances", () => {
        const serviceA = useService(ServiceA);
        const serviceN = useService(ServiceN);
        assert.strictEqual(serviceA.doSomething(), "Mocked ServiceA result");
        assert.strictEqual(serviceN.doSomethingElse(), "Real ServiceN result");
    });
});
