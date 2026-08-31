import {FactsServiceApp} from "./app";

// Creates an application instance
const factsService = new FactsServiceApp();

// Starts the Node-Boot server with the application deployed
factsService
    .start()
    .then(app => {
        console.debug(`FactsService started successfully at port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error(`Error starting FactsService: ${reason}`);
    });
