import {GhostApp} from "./app";

// Creates an application instance
const app = new GhostApp();

// Starts the Node-Boot server with the application deployed
app.start()
    .then(app => {
        app.logger.debug(`GhostApp started successfully at port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error(`Error starting GhostApp: ${reason}`);
    });
