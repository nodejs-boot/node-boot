import {defaultMetadataStorage} from "class-transformer/cjs/storage";
import {NodeBootAppView} from "@node-boot/core";
import {axios} from "./axios";
import {TestApp} from "./app";

describe(``, () => {
    let bootAppView: NodeBootAppView;
    const user: any = {firstName: "Manuel", lastName: "Santos"};

    beforeAll(() => {
        return new Promise((resolve, reject) => {
            // Start the application
            new TestApp()
                .start(3000)
                .then(app => {
                    bootAppView = app;
                    resolve(app);
                })
                .catch(error => reject(error));
        });
    });

    afterAll(() => {
        return new Promise(resolve => {
            defaultMetadataStorage.clear();
            bootAppView.framework.close().then(() => resolve(bootAppView));
        });
    });

    beforeEach(() => {});

    it("should use controller options when action transform options are not set", async () => {
        const response = await axios.post("/api/default", user);
        expect(response.status).toBe(200);
        expect(response.data.firstName).toBe("Manuel");
        expect(response.data.lastName).toBe(undefined);
    });

    it("should override controller options with action transformRequest and transformResponse set to false", async () => {
        const response = await axios.post("/api/noTransform", user);
        expect(response.status).toBe(200);
        expect(response.data.firstName).toBe("Manuel");
        expect(response.data.lastName).toBe("Santos");
    });

    it("should override controller options with action transformRequest option", async () => {
        const response = await axios.post("/api/transformRequestOnly", user);
        expect(response.status).toBe(200);
        expect(response.data.lastName).toBe("default");
    });

    it("should override controller options with action transformResponse option", async () => {
        const response = await axios.post("/api/transformResponseOnly", user);
        expect(response.status).toBe(200);
        expect(response.data.lastName).toBeUndefined();
    });
});
