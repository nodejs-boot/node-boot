import {Hook} from "@node-boot/test";
import {ApplicationContext} from "@node-boot/context";
import {jest} from "@jest/globals";
import SpiedClass = jest.SpiedClass;
import SpiedFunction = jest.SpiedFunction;

type SpyCallback = (spy: any) => void;

export class SpyHook extends Hook {
    private spies: Map<string, any> = new Map();
    private consumers: Map<string, SpyCallback[]> = new Map();

    private methodsToSpyOn: {
        serviceClass: new (...args: any[]) => any;
        methodName: string;
        consumer: SpyCallback;
        autoCleanup: boolean;
        allowMock: boolean;
    }[] = [];

    constructor() {
        super(2); // Control hook priority (higher number means it runs later in the lifecycle)
    }

    override beforeTests() {
        // Set up spies during the test lifecycle
        for (const {serviceClass, methodName, consumer, autoCleanup, allowMock} of this.methodsToSpyOn) {
            const {serviceInstance, originalMethod} = this.validateSpy(serviceClass, methodName, allowMock);

            const key = `${serviceClass.name}-${methodName}`;

            if (this.spies.has(key)) {
                throw new Error(
                    `Method "${String(methodName)}" of class "${serviceClass.name}" is already being spied on.`,
                );
            }

            const spy = jest.spyOn(serviceInstance, methodName as any);
            this.spies.set(key, spy);

            if (!this.consumers.has(key)) {
                this.consumers.set(key, []);
            }
            this.consumers.get(key)!.push(consumer);

            spy.mockImplementation((...args: any[]) => {
                const result = originalMethod.apply(serviceInstance, args);

                // Notify consumers
                this.consumers.get(key)?.forEach(callback => callback(spy));

                // Handle auto-cleanup
                if (autoCleanup) {
                    spy.mockRestore(); // Restore the original method
                    this.spies.delete(key); // Remove the spy from the map
                    this.consumers.delete(key); // Remove the consumer callbacks
                }

                return result;
            });
        }
    }

    override afterTests() {
        // Clean up all spies and consumers after tests
        this.spies.forEach(spy => spy.mockRestore());
        this.spies.clear();
        this.consumers.clear();
    }

    /**
     * Queue the spy setup to be processed during the lifecycle.
     * @param serviceClass - The service class to spy on.
     * @param methodName - The method name to spy on.
     * @param consumer - Callback that gets notified when the method is called.
     * @param autoCleanup - If true, the spy will be cleaned up after the first execution.
     * @param allowMock - If true, spy on jest mocks is allowed, otherwise an error will be thrown when spying on a mock
     */
    call<T extends object>(
        serviceClass: new (...args: any[]) => T,
        methodName: keyof T & string,
        consumer: SpyCallback,
        autoCleanup = true,
        allowMock = false,
    ) {
        this.methodsToSpyOn.push({serviceClass, methodName, consumer, autoCleanup, allowMock});
    }

    /**
     * Queue the spy setup to be processed during the lifecycle.
     * @param serviceClass - The service class to spy on.
     * @param methodName - The method name to spy on.
     */
    use<T extends object>(
        serviceClass: new (...args: any[]) => T,
        methodName: keyof T & string,
    ): SpiedClass<any> | SpiedFunction<any> {
        const {serviceInstance, originalMethod} = this.validateSpy(serviceClass, methodName, true);

        const spy = jest.spyOn(serviceInstance, methodName as any);

        if (!jest.isMockFunction(originalMethod)) {
            spy.mockImplementation((...args: any[]) => {
                return originalMethod.apply(serviceInstance, args);
            });
        }
        return spy;
    }

    private validateSpy(serviceClass: {new (...args: any[]): any}, methodName: string, allowMock: boolean = false) {
        const iocContainer = ApplicationContext.getIocContainer();
        if (!iocContainer) {
            throw new Error("IOC Container is required to use service spies.");
        }

        const serviceInstance = iocContainer.get(serviceClass);
        if (!serviceInstance) {
            throw new Error(`Service instance for ${serviceClass.name} not found.`);
        }

        const originalMethod = serviceInstance[methodName];
        if (typeof originalMethod !== "function") {
            throw new Error(`Function ${String(methodName)} is not a function on ${serviceClass.name}.`);
        }

        if (!allowMock && jest.isMockFunction(originalMethod)) {
            throw new Error(
                `Function ${String(methodName)} of ${
                    serviceClass.name
                } is a mock. Spying on mocks is not allowed. Please check Jest documentation for spy utilities on mocks.`,
            );
        }
        return {serviceInstance, originalMethod};
    }
}
