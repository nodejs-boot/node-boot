import {Exclude, Expose} from "class-transformer";
import {defaultMetadataStorage} from "class-transformer/cjs/storage";
import {NodeBootToolkit} from "@node-boot/engine";
import {Body, Controller, Post} from "../src";

describe(``, () => {
    let expressApp: any;
    let initializedUser: any;
    const user: any = {firstName: "Manuel", lastName: "Santos"};

    @Exclude()
    class UserModel {
        @Expose()
        firstName: string;

        lastName: string;
    }

    beforeAll(done => {
        // reset metadata args storage
        NodeBootToolkit.getMetadataArgsStorage().reset();

        function handler(user: UserModel) {
            initializedUser = user;
            const ret = new UserModel();
            ret.firstName = user.firstName;
            ret.lastName = user.lastName || "default";
            return ret;
        }

        @Controller("")
        class NoTransformResponseController {
            @Post("/default")
            default(@Body() user: UserModel) {
                return handler(user);
            }

            @Post("/transformRequestOnly", {transformRequest: true, transformResponse: false})
            transformRequestOnly(@Body() user: UserModel) {
                return handler(user);
            }

            @Post("/transformResponseOnly", {transformRequest: false, transformResponse: true})
            transformResponseOnly(@Body() user: UserModel) {
                return handler(user);
            }
        }

        expressApp = createExpressServer().listen(3001, done);
    });

    afterAll(done => {
        defaultMetadataStorage.clear();
        expressApp.close(done);
    });

    beforeEach(() => {
        initializedUser = undefined;
    });

    it("should use controller options when action transform options are not set", async () => {
        expect.assertions(4);
        const response = await axios.post("/default", user);
        expect(initializedUser).toBeInstanceOf(UserModel);
        expect(initializedUser.lastName).toBeUndefined();
        expect(response.status).toBe(200);
        expect(response.data.lastName).toBe("default");
    });

    it("should override controller options with action transformRequest option", async () => {
        expect.assertions(4);
        const response = await axios.post("/transformRequestOnly", user);
        expect(initializedUser).toBeInstanceOf(UserModel);
        expect(initializedUser.lastName).toBeUndefined();
        expect(response.status).toBe(200);
        expect(response.data.lastName).toBe("default");
    });

    it("should override controller options with action transformResponse option", async () => {
        expect.assertions(4);
        const response = await axios.post("/transformResponseOnly", user);
        expect(initializedUser).not.toBeInstanceOf(UserModel);
        expect(initializedUser.lastName).not.toBeUndefined();
        expect(response.status).toBe(200);
        expect(response.data.lastName).toBeUndefined();
    });
});
