import "reflect-metadata";
import {Container} from "typedi";
import {BaseServer, NodeBoot, NodeBootApp, NodeBootApplication} from "@node-boot/core";
import {ExpressServer} from "@node-boot/express-server";
import {EnableDI} from "@node-boot/di";

@EnableDI(Container)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start(port?: number): Promise<BaseServer> {
        return new Promise((resolve, reject) => {
            NodeBoot.run(ExpressServer)
                .then(app => {
                    app.listen(port)
                        .then(() => {
                            console.info("Node-Boot application started successfully");
                            resolve(app);
                        })
                        .catch(error => {
                            console.error("Error starting Node-Boot application.", error);
                            reject(error);
                        });
                })
                .catch(error => {
                    console.error("Error starting Node-Boot application.", error);
                    reject(error);
                });
        });
    }
}
