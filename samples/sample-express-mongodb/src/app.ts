import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
import {EnableFirebase} from "@nodeboot/starter-firebase";

@EnableDI(Container)
@EnableFirebase()
@EnableComponentScan()
@NodeBootApplication()
export class FactsServiceApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
