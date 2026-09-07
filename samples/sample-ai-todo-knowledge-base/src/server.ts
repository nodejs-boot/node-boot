import {AiTodoKnowledgeBaseApp} from "./app";

// Creates an application instance
const app = new AiTodoKnowledgeBaseApp();

// Starts the Node-Boot server with the application deployed
app.start()
    .then(app => {
        console.debug(`AiTodoKnowledgeBaseApp started successfully at port ${app.appOptions.port}`);
    })
    .catch(reason => {
        console.error(`Error starting AiTodoKnowledgeBaseApp: ${reason}`);
    });
