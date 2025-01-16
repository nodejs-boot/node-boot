import {Hook} from "@node-boot/test";
import {ApplicationContext} from "@node-boot/context";
import {jest} from "@jest/globals";
import SpiedClass = jest.SpiedClass;
import SpiedFunction = jest.SpiedFunction;

export class SpyHook extends Hook {
    constructor() {
        super(2); // Control hook priority (higher number means it runs later in the lifecycle)
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
