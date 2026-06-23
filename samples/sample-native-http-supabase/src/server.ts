import {SupabaseSampleApp} from "./app";

// Starts the Node-Boot server with the application deployed
new SupabaseSampleApp()
    .start()
    .then(app => {
        app.logger.debug(`Supabase Sample started successfully at port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error(`Error starting Supabase Sample: ${reason}`);
    });
