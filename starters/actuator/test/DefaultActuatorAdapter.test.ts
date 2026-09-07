import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context";
import {DefaultActuatorAdapter} from "../src/adapter";

describe("DefaultActuatorAdapter", () => {
    test("throws error if DI container is not configured", () => {
        const adapter = new DefaultActuatorAdapter();
        const prevDiOptions = ApplicationContext.get().diOptions;
        ApplicationContext.get().diOptions = undefined as any;

        try {
            assert.throws(() => {
                adapter.bind(
                    {
                        appName: "test",
                        serverType: "native-http",
                    },
                    {} as any,
                    {} as any,
                );
            }, /IOC Container is required for Actuator module/);
        } finally {
            ApplicationContext.get().diOptions = prevDiOptions;
        }
    });

    test("throws error if serverType is unsupported", () => {
        const adapter = new DefaultActuatorAdapter();
        const prevDiOptions = ApplicationContext.get().diOptions;
        ApplicationContext.get().diOptions = {
            iocContainer: {
                get: () => ({}),
            } as any,
        } as any;

        try {
            assert.throws(() => {
                adapter.bind(
                    {
                        appName: "test",
                        serverType: "ghost" as any,
                    },
                    {} as any,
                    {} as any,
                );
            }, /Actuator feature is only allowed for express, koa, fastify, hono and native-http/);
        } finally {
            ApplicationContext.get().diOptions = prevDiOptions;
        }
    });
});
