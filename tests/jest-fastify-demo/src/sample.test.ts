import {NotService, ServiceA, ServiceN, TestApp} from "./app";
import {useNodeBoot} from "@node-boot/jest";
import {spec} from "pactum";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Node-Boot Test", () => {
    const {useHttp, useTimer, useService, useConfig} = useNodeBoot(
        TestApp,
        ({useAppContext, useMock, useConfig, useAddress, useEnv, useCleanup, usePactum}) => {
            usePactum();

            useMock(ServiceA, {
                doSomething: () => "Mocked ServiceA result",
                //doSomething: jest.fn(() => "Mocked ServiceA result")
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

            // Register a cleanup function to be run after tests
            useCleanup({
                afterAll: () => {
                    console.log("Running cleanup after tests...");
                    // Here you can reset mock states, close resources, etc.
                },
            });
        },
    );

    it("should use real service instances", () => {
        const serviceA = useService(ServiceA);
        const serviceN = useService(ServiceN);
        expect(serviceA.doSomething()).toBe("Real ServiceA result");
        expect(serviceN.doSomethingElse()).toBe("Real ServiceN result");
    });

    it("should fail when not a service", () => {
        expect(() => useService(NotService)).toThrow("The class NotService is not decorated with @Service.");
    });

    it("should retrieve app configs", () => {
        const config = useConfig();
        expect(config).toBeDefined();
        expect(config.getNumber("app.port")).toBe(20000);
    });

    it("should retrieve env value", () => {
        expect(process.env["NODE_ENV"]).toBe("test");
        expect(process.env["FEATURE_FLAG"]).toBe("true");
    });

    it("should do http call", async () => {
        const {get} = useHttp();

        const result = await get<{serviceA: string; serviceN: string}>("/api/test/ping");
        expect(result.status).toBe(200);
        expect(result.data).toBeDefined();
        expect(result.data.serviceA).toBe("Real ServiceA result");
        expect(result.data.serviceN).toBe("Real ServiceN result");
    });

    it("should use pactum to http call", async () => {
        const response = await spec().get(`/api/test/ping`).expectStatus(200).returns("res.body");

        expect(response).toBeDefined();
        expect(response.serviceA).toBe("Real ServiceA result");
        expect(response.serviceN).toBe("Real ServiceN result");
    });

    describe("TimeControl", () => {
        it("should advance time by the specified milliseconds", () => {
            const {control} = useTimer();

            let callbackCalled = false;
            setTimeout(() => (callbackCalled = true), 1000);

            expect(callbackCalled).toBe(false);

            control().advanceTimeBy(1000); // Advance by 1 second
            expect(callbackCalled).toBe(true);
        });

        it("should run all pending timers", () => {
            const {control} = useTimer();

            let callback1Called = false;
            let callback2Called = false;

            setTimeout(() => (callback1Called = true), 500);
            setTimeout(() => (callback2Called = true), 1000);

            expect(callback1Called).toBe(false);
            expect(callback2Called).toBe(false);

            control().runAllTimers();

            expect(callback1Called).toBe(true);
            expect(callback2Called).toBe(true);
        });
    });

    describe("TimeTracking", () => {
        it("should track elapsed time correctly", () => {
            const {tracking} = useTimer();

            const tracker = tracking();
            tracker.start();
            jest.advanceTimersByTime(2000); // Simulate 2 seconds passing
            tracker.stop();

            const elapsedTime = tracker.calculateElapsedTime();
            expect(elapsedTime).toBeGreaterThanOrEqual(2000);
        });

        it("should handle multiple concurrent tracking instances", () => {
            const {tracking} = useTimer();

            const tracker1 = tracking();
            tracker1.start();

            jest.advanceTimersByTime(1000); // 1 second for tracker1

            const tracker2 = tracking();
            tracker2.start();

            jest.advanceTimersByTime(2000); // 2 seconds for tracker2 and 3 seconds for tracker1

            tracker1.stop();
            tracker2.stop();

            expect(tracker1.calculateElapsedTime()).toBeGreaterThanOrEqual(3000);
            expect(tracker2.calculateElapsedTime()).toBeGreaterThanOrEqual(2000);
        });
    });
});
