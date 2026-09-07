import {TodoMcpServerApp} from "./app";

// Creates an application instance
const app = new TodoMcpServerApp();

// Starts the Node-Boot application (MCP tools/resources/prompts served over stateless HTTP)
app.start()
    .then(app => {
        app.logger.info("TodoMcpServerApp started successfully, MCP server listening over HTTP at /mcp");
    })
    .catch(reason => {
        console.error(`Error starting TodoMcpServerApp: ${reason}`);
        process.exit(1);
    });
