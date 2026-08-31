import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableAuthorization} from "@nodeboot/authorization";
import {JsonObject} from "@nodeboot/context";
import {KoaServer} from "../../src";

import {TestCurrentUserChecker} from "./TestCurrentUserChecker";
import {TestAuthorizationChecker} from "./TestAuthorizationChecker";

// Side-effect imports: each `@Controller`/`@Middleware`/`@ErrorHandler`/`@Configuration`
// self-registers into `ApplicationContext` on module load, so no `@EnableComponentScan()`
// is needed for tests.
import "./HelloController";
import "./ItemsController";
import "./SecureController";
import "./ErrorsController";
import "./RequestLogMiddleware";
import "./TestErrorHandler";
import "./ServerConfiguration";

@EnableDI(Container)
@EnableAuthorization(TestCurrentUserChecker, TestAuthorizationChecker)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(KoaServer, additionalConfig);
    }
}
