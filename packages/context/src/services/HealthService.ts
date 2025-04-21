import {ApplicationLifecycleBridge} from "./ApplicationLifecycleBridge";

export class HealthService {
    #isRunning = false;

    constructor(readonly lifecycleBridge: ApplicationLifecycleBridge) {
        lifecycleBridge.subscribe("persistence.started", () => {
            this.#isRunning = true;
        });

        lifecycleBridge.subscribe("application.stopped", () => {
            this.#isRunning = false;
        });
    }

    async getLiveness(): Promise<{status: number; payload?: any}> {
        return {status: 200, payload: {status: "ok"}};
    }

    async getReadiness(): Promise<{status: number; payload?: any}> {
        if (!this.#isRunning) {
            return {
                status: 503,
                payload: {message: "Backend has not started yet", status: "error"},
            };
        }
        return {status: 200, payload: {status: "ok"}};
    }
}
