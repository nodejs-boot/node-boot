export interface ServerInstance {
    close(): Promise<void>;

    getHttpServer(): any;
}

/**
 * Process Signal Handler for Node-Boot Applications
 * Ensures proper cleanup on application shutdown to prevent memory leaks
 *
 * Usage:
 * const signalHandler = ProcessSignalHandler.getInstance();
 * signalHandler.registerServer(yourServerInstance);
 */
export class ProcessSignalHandler {
    private static instance: ProcessSignalHandler;
    private servers: Set<ServerInstance> = new Set();
    private isShuttingDown = false;

    private constructor() {
        this.setupSignalHandlers();
    }

    static getInstance(): ProcessSignalHandler {
        if (!ProcessSignalHandler.instance) {
            ProcessSignalHandler.instance = new ProcessSignalHandler();
        }
        return ProcessSignalHandler.instance;
    }

    registerServer(server: ServerInstance): void {
        this.servers.add(server);
    }

    unregisterServer(server: ServerInstance): void {
        this.servers.delete(server);
    }

    private setupSignalHandlers(): void {
        // Handle SIGTERM (graceful shutdown)
        process.on("SIGTERM", () => {
            console.log("Received SIGTERM signal. Starting graceful shutdown...");
            this.gracefulShutdown("SIGTERM");
        });

        // Handle SIGINT (Ctrl+C)
        process.on("SIGINT", () => {
            console.log("Received SIGINT signal. Starting graceful shutdown...");
            this.gracefulShutdown("SIGINT");
        });

        // Handle uncaught exceptions
        process.on("uncaughtException", error => {
            console.error("Uncaught Exception:", error);
            this.emergencyShutdown();
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Rejection at:", promise, "reason:", reason);
            this.emergencyShutdown();
        });
    }

    private async gracefulShutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            console.log("Shutdown already in progress...");
            return;
        }

        this.isShuttingDown = true;
        console.log(`Starting graceful shutdown due to ${signal}...`);

        try {
            // Close all registered servers
            const shutdownPromises = Array.from(this.servers).map(async server => {
                try {
                    await server.close();
                    console.log("Server closed successfully");
                } catch (error) {
                    console.error("Error closing server:", error);
                }
            });

            await Promise.all(shutdownPromises);
            console.log("All servers closed successfully");

            // Force exit after timeout
            setTimeout(() => {
                console.log("Forcing exit after timeout");
                process.exit(0);
            }, 5000);
        } catch (error) {
            console.error("Error during graceful shutdown:", error);
            process.exit(1);
        }

        process.exit(0);
    }

    private emergencyShutdown(): void {
        console.error("Emergency shutdown initiated...");

        // Try quick cleanup
        for (const server of this.servers) {
            try {
                // Force close without waiting
                const httpServer = server.getHttpServer();
                if (httpServer) {
                    httpServer.close();
                }
            } catch (error) {
                console.error("Error during emergency server close:", error);
            }
        }

        // Force exit after short timeout
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }
}

// Auto-initialize the signal handler
ProcessSignalHandler.getInstance();
