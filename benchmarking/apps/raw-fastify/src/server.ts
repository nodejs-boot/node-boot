import Fastify from "fastify";
import ormPlugin from "./plugins/orm";
import {helloRoute, todosRoute} from "./routes";

const PORT = 4003;

async function main() {
    const app = Fastify();

    await app.register(ormPlugin);
    await app.register(helloRoute);
    await app.register(todosRoute);

    try {
        await app.listen({port: PORT, host: "0.0.0.0"});
        console.log(`[raw-fastify] listening on http://localhost:${PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

main();
