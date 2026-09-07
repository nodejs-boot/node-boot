import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {ApplicationContext} from "@nodeboot/context";
import {EnableOpenApi, ExpressOpenApi, FastifyOpenApi, HonoOpenApi, HttpOpenApi, KoaOpenApi} from "../src";

describe("EnableOpenApi decorator", () => {
    test("registers OpenApiBridgeAdapter into ApplicationContext", async () => {
        const decorator = EnableOpenApi();
        class TestApp {}
        decorator(TestApp);

        const context = ApplicationContext.get();
        assert.ok(context.openApi);

        const expressAdapter = await context.openApi.bind("express");
        assert.ok(expressAdapter instanceof ExpressOpenApi);

        const koaAdapter = await context.openApi.bind("koa");
        assert.ok(koaAdapter instanceof KoaOpenApi);

        const fastifyAdapter = await context.openApi.bind("fastify");
        assert.ok(fastifyAdapter instanceof FastifyOpenApi);

        const httpAdapter = await context.openApi.bind("native-http");
        assert.ok(httpAdapter instanceof HttpOpenApi);

        const honoAdapter = await context.openApi.bind("hono");
        assert.ok(honoAdapter instanceof HonoOpenApi);
    });

    test("throws error when bound to an unsupported server type", async () => {
        const decorator = EnableOpenApi();
        class TestApp {}
        decorator(TestApp);

        const context = ApplicationContext.get();
        assert.ok(context.openApi);

        await assert.rejects(
            async () => {
                await context.openApi?.bind("unsupported-server");
            },
            {
                name: "Error",
                message:
                    "OpenAPI feature is only allowed for 'express', 'koa', 'fastify', 'native-http' and 'hono' servers. " +
                    "Please remove @EnableOpenApi from your application",
            },
        );
    });
});
