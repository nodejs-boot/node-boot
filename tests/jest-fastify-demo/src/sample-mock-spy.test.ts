import {useNodeBoot} from "@node-boot/jest";
import {spec} from "pactum";
import {TestAppWithPersistence, UserModel, UserService} from "./app-with-persistence";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Node-Boot Persistence Test", () => {
    const {useSpy, useMock} = useNodeBoot(TestAppWithPersistence, ({useConfig, usePactum}) => {
        useConfig({
            app: {
                port: 20000,
            },
        });

        usePactum();
    });

    it("should spy on a original service", async () => {
        const spy = useSpy(UserService, "findAllUser");

        const response = await spec().get(`/api/users/`).expectStatus(200).returns<Promise<UserModel[]>>("res.body");

        expect(response).toBeDefined();
        expect(response.length).toBe(0);

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should spy on a mocked service with jest mock", async () => {
        useMock(UserService, {
            getUserById: jest.fn(async (id: string) => {
                return {
                    id,
                    name: `User ${id}`,
                    email: "user@node-boot.io",
                    password: "encrypted",
                };
            }),
        });

        const spy = useSpy(UserService, "getUserById");

        await spec().get(`/api/users/${1}`).expectStatus(200).returns<Promise<UserModel>>("res.body");

        await spec().get(`/api/users/${2}`).expectStatus(200).returns<Promise<UserModel>>("res.body");

        expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should spy on a mocked service with plain data", async () => {
        useMock(UserService, {
            findAllUser: async () => [
                {
                    id: "1",
                    name: "Manuel Santos",
                    email: "ney.br.santos@gmail.com",
                    password: "123456",
                },
                {
                    id: "2",
                    name: "Gabriel Santos",
                    email: "bag.santos@gmail.com",
                    password: "123456",
                },
            ],
        });

        const spy = useSpy(UserService, "findAllUser");

        const response = await spec().get(`/api/users/`).expectStatus(200).returns<Promise<UserModel[]>>("res.body");

        expect(response).toBeDefined();
        expect(response.length).toBe(2);

        expect(spy).toHaveBeenCalledTimes(1);
    });
});
