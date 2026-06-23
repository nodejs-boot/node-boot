import {DataSource} from "typeorm";
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import {Counter, User, UserRepository} from "./setup/postgres.setup";

/**
 * Repository Operations Integration Tests
 * Tests CRUD operations, custom repositories, and query methods
 */
describe("Repository Operations (Integration)", () => {
    const dataSource: DataSource = new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5435,
        username: "postgres",
        password: "postgres",
        database: "test",
        entities: [User, Counter],
        synchronize: true,
    });

    before(async () => {
        await dataSource.initialize();
    });

    after(async () => {
        await dataSource.createEntityManager().clear(User);
        await dataSource.createEntityManager().clear(Counter);
        await dataSource.destroy();
    });

    afterEach(async () => {
        await dataSource.createEntityManager().clear(User);
    });

    describe("TypeORM Repository", () => {
        test("should create and find a user", async () => {
            const userRepository = dataSource.getRepository(User);

            const user = new User("John Doe", 100);
            await userRepository.save(user);

            const foundUser = await userRepository.findOne({where: {name: "John Doe"}});
            assert.ok(foundUser);
            assert.strictEqual(foundUser.name, "John Doe");
            assert.strictEqual(foundUser.money, 100);
        });

        test("should update a user", async () => {
            const userRepository = dataSource.getRepository(User);

            let user = new User("Jane Doe", 50);
            user = await userRepository.save(user);

            user.money = 150;
            await userRepository.save(user);

            const foundUser = await userRepository.findOne({where: {name: "Jane Doe"}});
            assert.ok(foundUser);
            assert.strictEqual(foundUser.money, 150);
        });

        test("should delete a user", async () => {
            const userRepository = dataSource.getRepository(User);

            const user = new User("Bob Smith", 200);
            await userRepository.save(user);

            await userRepository.remove(user);

            const foundUser = await userRepository.findOne({where: {name: "Bob Smith"}});
            assert.strictEqual(foundUser, null);
        });

        test("should find all users", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save(new User("User 1", 100));
            await userRepository.save(new User("User 2", 200));
            await userRepository.save(new User("User 3", 300));

            const users = await userRepository.find();
            assert.strictEqual(users.length, 3);
        });

        test("should find users with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save(new User("Rich User", 1000));
            await userRepository.save(new User("Poor User", 10));

            const richUsers = await userRepository
                .createQueryBuilder("user")
                .where("user.money > :money", {money: 500})
                .getMany();

            assert.strictEqual(richUsers.length, 1);
            assert.strictEqual(richUsers[0]?.name, "Rich User");
        });

        test("should count users", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save(new User("User 1", 100));
            await userRepository.save(new User("User 2", 200));

            const count = await userRepository.count();
            assert.strictEqual(count, 2);
        });

        test("should check if user exists", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save(new User("Existing User", 100));

            const exists = await userRepository.exists({where: {name: "Existing User"}});
            assert.strictEqual(exists, true);

            const notExists = await userRepository.exists({where: {name: "Non Existing"}});
            assert.strictEqual(notExists, false);
        });
    });

    describe("Custom Repository", () => {
        test("should create user using custom repository method", async () => {
            const userRepository = new UserRepository(dataSource);

            const user = await userRepository.createUser("Custom User", 150);

            assert.ok(user);
            assert.strictEqual(user.name, "Custom User");
            assert.strictEqual(user.money, 150);
        });

        test("should find user by name using custom repository method", async () => {
            const userRepository = new UserRepository(dataSource);

            await userRepository.createUser("Find Me", 200);

            const user = await userRepository.findUserByName("Find Me");
            assert.ok(user);
            assert.strictEqual(user.money, 200);
        });

        test("should return null when user not found", async () => {
            const userRepository = new UserRepository(dataSource);

            const user = await userRepository.findUserByName("Non Existing");
            assert.strictEqual(user, null);
        });

        test("should extend repository functionality", async () => {
            const userRepository = new UserRepository(dataSource);

            await userRepository.createUser("User 1", 100);
            await userRepository.createUser("User 2", 200);
            await userRepository.createUser("User 3", 300);

            // Should still have access to inherited methods
            const count = await userRepository.count();
            assert.strictEqual(count, 3);

            const users = await userRepository.find();
            assert.strictEqual(users.length, 3);
        });
    });

    describe("Bulk Operations", () => {
        test("should insert multiple users", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = [new User("User 1", 100), new User("User 2", 200), new User("User 3", 300)];

            await userRepository.save(users);

            const count = await userRepository.count();
            assert.strictEqual(count, 3);
        });

        test("should update multiple users with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save([
                new User("Update 1", 100),
                new User("Update 2", 100),
                new User("Update 3", 150),
            ]);

            await userRepository
                .createQueryBuilder()
                .update(User)
                .set({money: 500})
                .where("money = :money", {money: 100})
                .execute();

            const updated = await userRepository.find({where: {money: 500}});
            assert.strictEqual(updated.length, 2);
        });

        test("should delete multiple users with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            await userRepository.save([new User("Delete 1", 100), new User("Delete 2", 100), new User("Keep 1", 200)]);

            await userRepository.createQueryBuilder().delete().where("money = :money", {money: 100}).execute();

            const remaining = await userRepository.find();
            assert.strictEqual(remaining.length, 1);
            assert.strictEqual(remaining[0]?.name, "Keep 1");
        });
    });

    describe("Entity Manager", () => {
        test("should use entity manager for operations", async () => {
            const em = dataSource.createEntityManager();

            const user = new User("EM User", 300);
            await em.save(user);

            const found = await em.findOne(User, {where: {name: "EM User"}});
            assert.ok(found);
            assert.strictEqual(found.money, 300);
        });

        test("should perform transaction with entity manager", async () => {
            const em = dataSource.createEntityManager();

            await em.transaction(async transactionalEm => {
                const user = new User("Transaction User", 400);
                await transactionalEm.save(user);
            });

            const found = await em.findOne(User, {where: {name: "Transaction User"}});
            assert.ok(found);
        });
    });
});
