import "reflect-metadata";
import {createServer, Server} from "node:http";
import {Container} from "typedi";
import {ApplicationContext, JsonObject} from "@nodeboot/context";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableAuthorization} from "@nodeboot/authorization";
import {EncoreServer} from "../../src";

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

/**
 * `EncoreServer` doesn't own an HTTP listening socket - in real usage, Encore.ts's own runtime
 * calls `getHandler()` as a raw endpoint. For an HTTP-driven test, this wraps that same handler in
 * a real `http.Server` bound to the app's configured port, so `useHttp()` (which assumes something
 * is actually listening on `app.port`) works exactly as it would for any other adapter.
 */
let wrapperServer: Server | undefined;

export async function closeTestServer(): Promise<void> {
    if (!wrapperServer) return;
    await new Promise<void>(resolve => wrapperServer!.close(() => resolve()));
    wrapperServer = undefined;
}

@EnableDI(Container)
@EnableAuthorization(TestCurrentUserChecker, TestAuthorizationChecker)
@NodeBootApplication()
export class TestApp implements NodeBootApp {
    async start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        const appView = await NodeBoot.run(EncoreServer, additionalConfig);

        const server = appView.server as EncoreServer;
        const port = ApplicationContext.get().applicationOptions.port ?? 3000;

        await new Promise<void>((resolve, reject) => {
            wrapperServer = createServer(server.getHandler());
            wrapperServer.once("error", reject);
            wrapperServer.listen(port, "0.0.0.0", () => resolve());
        });

        return appView;
    }
}
