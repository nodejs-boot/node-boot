import {useNodeBoot} from "@node-boot/jest";
import {spec} from "pactum";
import {TestAppWithPersistence, UserModel, UserRepository, UserService} from "./app-with-persistence";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Node-Boot Persistence Test", () => {
    const {useSpy, useMock, useRepository} = useNodeBoot(
        TestAppWithPersistence,
        ({useConfig, usePactum, useCleanup}) => {
            useConfig({
                app: {
                    port: 20000,
                },
            });

            usePactum();

            useCleanup({
                afterEach: async () => {
                    const repository = useRepository(UserRepository);
                    const users = await repository.find({});
                    for (const user of users) {
                        await repository.delete({id: user.id});
                    }
                },
            });
        },
    );

    describe("API Tests", () => {
        it("should retrieve data from API", async () => {
            const response = await spec()
                .get(`/api/users/`)
                .expectStatus(200)
                .returns<Promise<UserModel[]>>("res.body");

            expect(response).toBeDefined();
            expect(response.length).toBe(0);
        });

        it("should save data using the API", async () => {
            const response = await spec()
                .post(`/api/users/`)
                .withBody({
                    name: "Manuel Santos",
                    email: "ney.br.santos@gmail.com",
                    password: "123456",
                })
                .expectStatus(200)
                .returns<Promise<UserModel>>("res.body");

            expect(response).toBeDefined();
            expect((response as any).id).toBeDefined();
            expect(response.name).toBe("Manuel Santos");
            expect(response.email).toBe("ney.br.santos@gmail.com");

            const repository = useRepository(UserRepository);

            const users = await repository.find({});
            expect(users.length).toBe(1);
            expect(users[0]?.name).toBe("Manuel Santos");
        });

        it("should save data using repository and retrieve via API", async () => {
            const repository = useRepository(UserRepository);
            const user = await repository.save({
                name: "Manuel Santos",
                email: "ney.br.santos@gmail.com",
                password: "123456",
            });

            expect(user.id).toBeDefined();
            expect(user.name).toBe("Manuel Santos");
            expect(user.email).toBe("ney.br.santos@gmail.com");

            const response = await spec()
                .get(`/api/users/`)
                .expectStatus(200)
                .returns<Promise<UserModel[]>>("res.body");

            expect(response).toBeDefined();
            expect(response.length).toBe(1);
            expect(response[0]?.name).toBe("Manuel Santos");
            expect(response[0]?.email).toBe("ney.br.santos@gmail.com");
        });

        it("should spy on a real repository", async () => {
            const spy = useSpy(UserRepository, "save");

            const response = await spec()
                .post(`/api/users/`)
                .withBody({
                    name: "Manuel Santos",
                    email: "ney.br.santos@gmail.com",
                    password: "123456",
                })
                .expectStatus(200)
                .returns<Promise<UserModel>>("res.body");

            expect(response).toBeDefined();
            expect((response as any).id).toBeDefined();

            expect(spy).toHaveBeenCalledTimes(1);
        });

        it("should spy on a mocked service with plain data", async () => {
            useMock(UserService, {
                findAllUser: async () => [
                    {
                        id: 1,
                        name: "Manuel Santos",
                        email: "ney.br.santos@gmail.com",
                        password: "123456",
                    },
                    {
                        id: 2,
                        name: "Gabriel Santos",
                        email: "bag.santos@gmail.com",
                        password: "123456",
                    },
                ],
            });

            const spy = useSpy(UserService, "findAllUser");

            const response = await spec()
                .get(`/api/users/`)
                .expectStatus(200)
                .returns<Promise<UserModel[]>>("res.body");

            expect(response).toBeDefined();
            expect(response.length).toBe(2);

            expect(spy).toHaveBeenCalledTimes(1);

            // restore mock with original instance
            //restore();
        });

        it("should spy on a mocked service with jest mock", async () => {
            useMock(UserService, {
                findAllUser: jest.fn(async () => []),
            });

            const spy = useSpy(UserService, "findAllUser");

            await spec().get(`/api/users/`).expectStatus(200).returns<Promise<UserModel[]>>("res.body");

            await spec().get(`/api/users/`).expectStatus(200).returns<Promise<UserModel[]>>("res.body");

            expect(spy).toHaveBeenCalledTimes(2);

            // restore mock with original instance
            //restore();
        });
    });
});
