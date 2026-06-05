import {AsyncLocalStorage} from "async_hooks";

import {StorageKey, StorageValue, StorageDriver, Storage} from "./interface";

class Store {
    // AsyncLocalStorage expects a store to be provided on each `.run` call.
    // This wrapper keeps nested context layers to preserve transactional semantics.

    private layers: (Storage | undefined)[] = [];
    private storage: Storage | undefined;

    get active() {
        return !!this.storage;
    }

    public get<T>(key: StorageKey): T {
        return this.storage?.get(key) as T;
    }

    public set(key: StorageKey, value: StorageValue): void {
        this.storage?.set(key, value);
    }

    public enter() {
        const newStorage = new Map(this.storage);
        this.layers.push(this.storage);
        this.storage = newStorage;
        return newStorage;
    }

    public exit(storage: Storage) {
        if (this.storage === storage) {
            this.storage = this.layers.pop() ?? new Map();
            return;
        }

        const index = this.layers.lastIndexOf(storage);

        if (index >= 0) {
            this.layers.splice(index, 1);
        }
    }
}

export class AsyncLocalStorageDriver implements StorageDriver {
    private context: AsyncLocalStorage<Store>;

    constructor() {
        this.context = new AsyncLocalStorage();
    }

    get active() {
        return this.store.active;
    }

    private get store() {
        return this.context.getStore() || new Store();
    }

    public get<T>(key: StorageKey): T {
        return this.store?.get(key);
    }

    public set(key: StorageKey, value: StorageValue): void {
        this.store?.set(key, value);
    }

    public async run<T>(cb: () => Promise<T>): Promise<T> {
        const storage = this.store.enter();

        try {
            return await this.context.run(this.store, cb);
        } finally {
            this.store.exit(storage);
        }
    }
}
