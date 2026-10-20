import "reflect-metadata";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableAuthorization} from "@nodeboot/authorization";
import {JsonObject} from "@nodeboot/context";
import {HonoServer} from "../../src";

import {TestCurrentUserChecker} from "./TestCurrentUserChecker";
import {TestAuthorizationChecker} from "./TestAuthorizationChecker";

// Side-effect imports: each `@Controller`/`@Middleware`/`@ErrorHandler` self-registers into
// `ApplicationContext` on module load, so no `@EnableComponentScan()` is needed for tests.
import "./HelloController";
import "./ItemsController";
import "./SecureController";
import "./ErrorsController";
import "./RequestLogMiddleware";
import "./TestErrorHandler";
@EnableAuthorization(TestCurrentUserChecker, TestAuthorizationChecker)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(HonoServer, additionalConfig);
    }
}
