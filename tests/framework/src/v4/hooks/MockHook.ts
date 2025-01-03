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
}
