import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication} from "@node-boot/core";
import {ExpressServer} from "@node-boot/express-server";
import {EnableDI} from "@node-boot/di";


@EnableDI(Container)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start() {
        NodeBoot.run(ExpressServer)
            .then(app => {
                app.listen();
                console.info("Node-Boot application started successfully");
            })
            .catch(error => {
                console.error("Error starting Node-Boot application.", error);
            });
    }
}
