import {Hook} from "./Hook";
import {NodeBootAppView} from "@node-boot/core";

export class AppContextHook extends Hook {
    private consumers: ((appContext: NodeBootAppView) => void)[] = [];

    override afterStart(bootApp: NodeBootAppView): Promise<void> | void {
        this.setState("context", bootApp);
    }

    override beforeTests() {
        const appContext = this.getState<NodeBootAppView>("context");
        if (appContext) {
            this.consumers.forEach(consumer => consumer(appContext));
        }
    }

    call(consumer: (appContext: Omit<NodeBootAppView, "server">) => void) {
        this.consumers.push(consumer);
    }

    use(consumer: (appContext: Omit<NodeBootAppView, "server">) => void) {
        this.call(consumer);
    }
}
