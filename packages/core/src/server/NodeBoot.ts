import {BaseServer} from "./BaseServer";
import {NodeBootAppView} from "./NodeBootApp";

export class NodeBoot {
    static async run<TApplicationServer extends new (...args: any[]) => BaseServer<any, any>>(
        applicationServer: TApplicationServer,
        port?: number,
    ): Promise<NodeBootAppView> {
        try {
            const application = new applicationServer();
            const server = await application.run(port);
            const appView = server.appView();
            appView.logger.info("Node-Boot application initialized successfully");

            await server.listen();
            appView.logger.info("Node-Boot application started successfully");
            return appView;
        } catch (error) {
            console.error("Error starting Node-Boot application.", error);
            throw error;
        }
    }
}
