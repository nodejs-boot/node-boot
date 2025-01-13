import {useNodeBoot} from "@node-boot/jest";
import {TestAppWithPersistence, UserModel, UserRepository} from "./app-with-persistence";

/**
 * A test suite demonstrating the usage of useNodeBoot framework for testing NodeBoot
 * applications with dependency injection and mocking capabilities.
 * */
describe("Sample Node-Boot test with Koa Server :: With Supertest Hook", () => {
    const {useSpy, useRepository, useSupertest} = useNodeBoot(TestAppWithPersistence, ({useConfig, useCleanup}) => {
        useConfig({
            app: {
                port: 20000,
            },
        });

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
            const {get} = useSupertest();

            const response = await get(`/api/users/`).expect(200);

            const users: UserModel[] = response.body;

            expect(users).toBeDefined();
            expect(users.length).toBe(0);
        });

        it("should save data using the API", async () => {
            const {post} = useSupertest();

            const response = await post(`/api/users/`)
                .send({
                    name: "Manuel Santos",
                    email: "ney.br.santos@gmail.com",
                    password: "123456",
                })
                .expect(200);

            const user = response.body;

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.name).toBe("Manuel Santos");
            expect(user.email).toBe("ney.br.santos@gmail.com");

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

            const {get} = useSupertest();

            const response = await get(`/api/users/`).expect(200);

            const users: UserModel[] = response.body;

            expect(users).toBeDefined();
            expect(users.length).toBe(1);
            expect(users[0]?.name).toBe("Manuel Santos");
            expect(users[0]?.email).toBe("ney.br.santos@gmail.com");
        });

        it("should spy on a real repository", async () => {
            const spy = useSpy(UserRepository, "save");
            const {post} = useSupertest();

            const response = await post(`/api/users/`)
                .send({
                    name: "Manuel Santos",
                    email: "ney.br.santos@gmail.com",
                    password: "123456",
                })
                .expect(200);

            const user = response.body;

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();

            expect(spy).toHaveBeenCalledTimes(1);
        });
    });
});
