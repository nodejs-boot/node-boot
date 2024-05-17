import {FactsServiceApp} from "./app";

// Starts the Node-Boot server with the application deployed
new FactsServiceApp()
    .start()
    .then(app => {
        console.debug(`FactsService started successfully at port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error(`Error starting FactsService: ${reason}`);
    });
