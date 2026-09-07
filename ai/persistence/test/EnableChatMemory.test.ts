import {describe, it} from "node:test";
import assert from "node:assert/strict";
import "reflect-metadata";
import {ApplicationContext} from "@nodeboot/context";
import {PersistenceContext} from "@nodeboot/starter-persistence";
import {EnableChatMemory} from "../src/decorator/EnableChatMemory";
import {ChatMemoryAdapter} from "../src/adapter/ChatMemoryAdapter";
import {ChatMemoryMessageEntity} from "../src/entity/ChatMemoryMessageEntity";
import {ChatMemoryMongoMessageEntity} from "../src/entity/ChatMemoryMongoMessageEntity";

function decorate(options?: Parameters<typeof EnableChatMemory>[0]) {
    @EnableChatMemory(options)
    class ThrowawayApp {}
    return ThrowawayApp;
}

describe("@EnableChatMemory decorator", () => {
    it("registers no persistence entity for the default 'memory' backend", () => {
        const before = PersistenceContext.get().repositories.length;
        decorate();
        assert.equal(PersistenceContext.get().repositories.length, before);
    });

    it("registers the SQL entity/repository pair only when type is 'sql'", () => {
        const before = PersistenceContext.get().repositories.length;
        decorate({type: "sql"});

        const registered = PersistenceContext.get().repositories.slice(before);
        assert.equal(registered.length, 1);
        assert.equal(registered[0]!.entity, ChatMemoryMessageEntity);
    });

    it("registers the Mongo entity/repository pair only when type is 'mongo'", () => {
        const before = PersistenceContext.get().repositories.length;
        decorate({type: "mongo"});

        const registered = PersistenceContext.get().repositories.slice(before);
        assert.equal(registered.length, 1);
        assert.equal(registered[0]!.entity, ChatMemoryMongoMessageEntity);
    });

    it("pushes a ChatMemoryAdapter onto the application context's feature adapters", () => {
        const before = ApplicationContext.get().applicationFeatureAdapters.length;
        decorate({maxMessages: 5});

        const adapters = ApplicationContext.get().applicationFeatureAdapters.slice(before);
        assert.equal(adapters.length, 1);
        assert.ok(adapters[0]! instanceof ChatMemoryAdapter);
    });
});

describe("ChatMemoryAdapter", () => {
    function fakeLogger() {
        return {info: () => {}, warn: () => {}, error: () => {}, debug: () => {}} as any;
    }

    function fakeIocContainer() {
        const registry = new Map<any, any>();
        return {
            set: (key: any, value: any) => registry.set(key, value),
            get: (key: any) => registry.get(key),
            has: (key: any) => registry.has(key),
        } as any;
    }

    it("registers an in-memory ChatMemory bean when no backend is configured", async () => {
        const iocContainer = fakeIocContainer();
        const adapter = new ChatMemoryAdapter({});

        await adapter.bind({iocContainer, logger: fakeLogger(), config: {} as any});

        assert.ok(iocContainer.has("ChatMemoryRepository"));
        assert.ok(iocContainer.has("ChatMemory"));
    });

    it("throws a clear error when a database backend is selected without a bound repository", async () => {
        const iocContainer = fakeIocContainer();
        const adapter = new ChatMemoryAdapter({type: "sql"});

        assert.throws(
            () => adapter.bind({iocContainer, logger: fakeLogger(), config: {} as any}),
            /EnableRepositories/,
        );
    });
});
