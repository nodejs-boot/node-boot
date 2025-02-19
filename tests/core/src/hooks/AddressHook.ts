import {Hook} from "./Hook";
import {NodeBootAppView} from "@nodeboot/core";

export class AddressHook extends Hook {
    private consumers: ((address: string) => void)[] = [];

    override afterStart(bootApp: NodeBootAppView): Promise<void> | void {
        // Provide the server address to the address hook
        const address = `http://localhost:${bootApp.appOptions.port}`;
        this.setState("address", address);
    }

    override beforeTests() {
        const address = this.getState<string>("address");
        if (address) {
            this.consumers.forEach(consumer => consumer(address));
        }
    }

    call(consumer: (address: string) => void) {
        this.consumers.push(consumer);
    }
}
