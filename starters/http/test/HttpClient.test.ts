import {afterEach, beforeEach, describe, it} from "node:test";
import assert from "node:assert/strict";

import {ApplicationContext} from "@nodeboot/context";
import {HttpClient, HttpClientStub} from "../src";
import {HttpClientAdapter} from "../src/adapter";

describe("HttpClient decorator", () => {
    let originalAdapters: any[];

    beforeEach(() => {
        originalAdapters = ApplicationContext.get().applicationFeatureAdapters;
        ApplicationContext.get().applicationFeatureAdapters = [];
    });

    afterEach(() => {
        ApplicationContext.get().applicationFeatureAdapters = originalAdapters;
    });

    it("registers an HttpClientAdapter into the application feature adapters", () => {
        class MyHttpClient extends HttpClientStub {}
        HttpClient({baseURL: "https://example.com"})(MyHttpClient);

        const adapters = ApplicationContext.get().applicationFeatureAdapters;
        assert.equal(adapters.length, 1);
        assert.ok(adapters[0] instanceof HttpClientAdapter);
    });

    it("registers a new adapter for every class it decorates", () => {
        class ClientA extends HttpClientStub {}
        class ClientB extends HttpClientStub {}
        HttpClient({baseURL: "https://a.example.com"})(ClientA);
        HttpClient({baseURL: "https://b.example.com"})(ClientB);

        assert.equal(ApplicationContext.get().applicationFeatureAdapters.length, 2);
    });
});
