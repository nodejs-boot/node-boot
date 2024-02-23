import {NodeBoot, NodeBootApp} from "@node-boot/core";
import {ExpressServer} from "@node-boot/express-server";

export const nodeBootRun = async <TApplication extends new (...args: any[]) => NodeBootApp>(
    ApplicationClass: TApplication,
) => {
    new ApplicationClass();

    // Start the application
    const appView = await NodeBoot.run(ExpressServer);
    console.info("Node-Boot application started successfully");

    return {
        appView,
        teardown: async () => {
            await appView.framework.close();
        },
    };
};
