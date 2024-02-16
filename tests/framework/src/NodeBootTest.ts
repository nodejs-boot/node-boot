import {NodeBoot, NodeBootApp} from "@node-boot/core";
import {ApplicationContext} from "@node-boot/context";
import {ExpressServer} from "@node-boot/express-server";

export const nodeBootRun = async <TApplication extends new (...args: any[]) => NodeBootApp>(ApplicationClass: TApplication) => {

    new ApplicationClass();

    // Start the application
    const server = await NodeBoot.run(ExpressServer);
    await server.listen();
    console.info("Node-Boot application started successfully");
    await server.close();


    const applicationContext = ApplicationContext.get();

    return {
        applicationContext,
        iocContainer: applicationContext.diOptions?.iocContainer,
    };
};