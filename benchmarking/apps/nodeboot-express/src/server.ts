import {NodeBootExpressBenchApp} from "./app";

new NodeBootExpressBenchApp()
    .start()
    .then(app => {
        app.logger.info(`[nodeboot-express] listening on port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error("Error starting nodeboot-express benchmark app:", reason);
        process.exit(1);
    });
