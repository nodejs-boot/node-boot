import {NodeBootKoaBenchApp} from "./app";

new NodeBootKoaBenchApp()
    .start()
    .then(app => {
        app.logger.info(`[nodeboot-koa] listening on port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error("Error starting nodeboot-koa benchmark app:", reason);
        process.exit(1);
    });
