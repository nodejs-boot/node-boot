import pactum from "pactum";
import {NodeBootAppView} from "@node-boot/core";
import {Hook} from "./Hook";

/**
 * The `PactumHook` class integrates Pactum's HTTP testing features with NodeBoot.
 * It configures the server address from the NodeBoot application as the base URL.
 */
export class PactumHook extends Hook {
    /**
     * Set up the Pactum base URL after the NodeBoot application starts.
     *
     * @param bootApp The NodeBoot application instance.
     */
    override afterStart(bootApp: NodeBootAppView): void {
        const address = this.getState<string>("baseUrl") ?? `http://localhost:${bootApp.appOptions.port}`;
        pactum.request.setBaseUrl(address);
        pactum.request.setDefaultTimeout(15000);
        console.log(`Pactum base URL set to ${address}`);
    }

    /**
     * Resets Pactum configuration after tests.
     */
    override async afterTests() {
        pactum.request.setBaseUrl(""); // Clear the base URL
        console.log("Pactum configuration has been reset after tests.");
    }

    call(baseUrl?: string) {
        this.setState("baseUrl", baseUrl);
        if (baseUrl) {
            console.log(`Pactum hook called with baseUlr ${baseUrl}`);
        } else {
            console.log(`Pactum hook called without baseUlr. Should use Node-Boot App server address.`);
        }
    }
}
