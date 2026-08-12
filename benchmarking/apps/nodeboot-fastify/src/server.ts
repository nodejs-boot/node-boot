import {NodeBootFastifyBenchApp} from "./app";

new NodeBootFastifyBenchApp()
    .start()
    .then(app => {
        app.logger.info(`[nodeboot-fastify] listening on port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error("Error starting nodeboot-fastify benchmark app:", reason);
        process.exit(1);
    });
