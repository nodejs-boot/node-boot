import {useNodeBoot} from "@node-boot/jest";
import {spec} from "pactum";
import {TestAppWithPersistence, UserModel, UserRepository} from "./app-with-persistence";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Node-Boot Persistence Test", () => {
    const {useSpy, useRepository} = useNodeBoot(TestAppWithPersistence, ({useConfig, usePactum, useCleanup}) => {
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
    });

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
    });
});
