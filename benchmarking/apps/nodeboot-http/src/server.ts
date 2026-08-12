import {NodeBootHttpBenchApp} from "./app";

new NodeBootHttpBenchApp()
    .start()
    .then(app => {
        app.logger.info(`[nodeboot-http] listening on port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error("Error starting nodeboot-http benchmark app:", reason);
        process.exit(1);
    });
