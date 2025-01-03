import {Hook} from "./Hook";
import {NodeBootAppView} from "@node-boot/core";

export class EnvHook extends Hook {
    override afterStart(_: NodeBootAppView): Promise<void> | void {
        // Save original environment variables for restoration
        this.setState("originalEnv", {...process.env});
    }

    override beforeTests() {
        const envVars = this.getState<Record<string, string>>("envVars") || {};
        Object.assign(process.env, envVars);
    }

    override afterTests() {
        const originalEnv = this.getState<Record<string, string>>("originalEnv");
        if (originalEnv) {
            process.env = originalEnv;
        }
    }

    call(vars: Record<string, string>) {
        const envVars = this.getState<Record<string, string>>("envVars") || {};
        Object.assign(envVars, vars);
        this.setState("envVars", envVars);
    }
}
