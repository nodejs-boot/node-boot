import {Hook} from "./Hook";
import {ApplicationContext} from "@node-boot/context";

export class MockHook extends Hook {
    private mocks: (() => void)[] = [];

    override beforeTests() {
        this.mocks.forEach(mockFn => mockFn());
    }

    override afterTests() {
        this.mocks = [];
    }

    call<T>(serviceClass: new (...args: any[]) => T, mock: Partial<T>) {
        this.mocks.push(() => {
            ApplicationContext.getIocContainer()?.set(serviceClass, mock);
        });
    }

    use<T>(serviceClass: new (...args: any[]) => T, mock: Partial<T>) {
        const originalInstance = ApplicationContext.getIocContainer()?.get(serviceClass);

        ApplicationContext.getIocContainer()?.set(serviceClass, mock);

        return {
            restore: (): void => {
                ApplicationContext.getIocContainer()?.set(serviceClass, originalInstance);
            },
        };
    }
}
