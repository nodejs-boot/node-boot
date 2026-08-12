import fp from "fastify-plugin";
import {FastifyPluginAsync} from "fastify";
import {AppDataSource} from "../data-source";

declare module "fastify" {
    interface FastifyInstance {
        orm: typeof AppDataSource;
    }
}

// Idiomatic Fastify pattern: a `fastify-plugin`-wrapped decorator plugin so `fastify.orm` is
// available to every route plugin registered after it, without breaking Fastify's encapsulation.
const ormPlugin: FastifyPluginAsync = async fastify => {
    await AppDataSource.initialize();
    fastify.decorate("orm", AppDataSource);
    fastify.addHook("onClose", async () => {
        await AppDataSource.destroy();
    });
};

export default fp(ormPlugin, {name: "orm-plugin"});
