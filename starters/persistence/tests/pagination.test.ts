import {DataSource} from "typeorm";
import {describe, test, before, after, afterEach} from "node:test";
import * as assert from "node:assert";
import {User} from "./postgres/entities/User.entity";
import {Counter} from "./postgres/entities/Counter.entity";

/**
 * Pagination Integration Tests
 * Tests pagination, sorting, and filtering capabilities
 */
describe("Pagination & Sorting (Integration)", () => {
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

        // Seed test data
        const userRepository = dataSource.getRepository(User);
        const users = [];
        for (let i = 1; i <= 25; i++) {
            users.push(new User(`User ${i}`, i * 100));
        }
        await userRepository.save(users);
    });

    after(async () => {
        await dataSource.createEntityManager().clear(User);
        await dataSource.createEntityManager().clear(Counter);
        await dataSource.destroy();
    });

    afterEach(async () => {
        // Clear if needed between tests
    });

    describe("Basic Pagination", () => {
        test("should skip and take records", async () => {
            const userRepository = dataSource.getRepository(User);

            const page1 = await userRepository.find({
                skip: 0,
                take: 10,
            });

            assert.strictEqual(page1.length, 10);
            assert.strictEqual(page1[0].name, "User 1");
            assert.strictEqual(page1[9].name, "User 10");
        });

        test("should get second page", async () => {
            const userRepository = dataSource.getRepository(User);

            const pageSize = 10;
            const pageNumber = 2;
            const page2 = await userRepository.find({
                skip: (pageNumber - 1) * pageSize,
                take: pageSize,
            });

            assert.strictEqual(page2.length, 10);
            assert.strictEqual(page2[0].name, "User 11");
            assert.strictEqual(page2[9].name, "User 20");
        });

        test("should get last page with remaining items", async () => {
            const userRepository = dataSource.getRepository(User);

            const pageSize = 10;
            const page3 = await userRepository.find({
                skip: 20,
                take: pageSize,
            });

            assert.strictEqual(page3.length, 5);
            assert.strictEqual(page3[0].name, "User 21");
            assert.strictEqual(page3[4].name, "User 25");
        });

        test("should count total for pagination info", async () => {
            const userRepository = dataSource.getRepository(User);

            const [users, total] = await userRepository.findAndCount({
                skip: 0,
                take: 10,
            });

            assert.strictEqual(users.length, 10);
            assert.strictEqual(total, 25);
        });
    });

    describe("Sorting", () => {
        test("should sort by name ascending", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository.find({
                order: {name: "ASC"},
                take: 5,
            });

            assert.strictEqual(users.length, 5);
            assert.strictEqual(users[0].name, "User 1");
            assert.strictEqual(users[4].name, "User 17");
        });

        test("should sort by money descending", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository.find({
                order: {money: "DESC"},
                take: 5,
            });

            assert.strictEqual(users.length, 5);
            assert.strictEqual(users[0].money, 2500); // User 25
            assert.strictEqual(users[4].money, 2100); // User 21
        });

        test("should sort by multiple fields", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository.find({
                order: {money: "DESC", name: "ASC"},
                take: 25,
            });

            assert.ok(users.length > 0);
            // Highest money first
            assert.strictEqual(users[0].money, 2500);
        });

        test("should sort with pagination", async () => {
            const userRepository = dataSource.getRepository(User);

            const page1 = await userRepository.find({
                skip: 0,
                take: 10,
                order: {money: "DESC"},
            });

            const page2 = await userRepository.find({
                skip: 10,
                take: 10,
                order: {money: "DESC"},
            });

            // Verify money is decreasing across pages
            assert.ok(page1[page1.length - 1].money > page2[0].money);
        });
    });

    describe("Filtering with Pagination", () => {
        test("should filter and paginate with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository
                .createQueryBuilder("user")
                .where("user.money > :money", {money: 1000})
                .orderBy("user.name", "ASC")
                .skip(0)
                .take(5)
                .getMany();

            // Should find users with money > 1000 (User 11+)
            assert.ok(users.length > 0);
            users.forEach(user => {
                assert.ok(user.money > 1000);
            });
        });

        test("should filter, sort, and paginate combined", async () => {
            const userRepository = dataSource.getRepository(User);

            const [users, total] = await userRepository
                .createQueryBuilder("user")
                .where("user.money >= :money", {money: 1000})
                .orderBy("user.money", "DESC")
                .skip(0)
                .take(5)
                .getManyAndCount();

            assert.ok(total > 0);
            users.forEach(user => {
                assert.ok(user.money >= 1000);
            });

            // Verify descending order
            for (let i = 1; i < users.length; i++) {
                assert.ok(users[i - 1].money >= users[i].money);
            }
        });
    });

    describe("Query Builder Pagination", () => {
        test("should paginate with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository
                .createQueryBuilder("user")
                .skip(0)
                .take(10)
                .addOrderBy("user.name", "ASC")
                .getMany();

            assert.strictEqual(users.length, 10);
        });

        test("should get paginated count with query builder", async () => {
            const userRepository = dataSource.getRepository(User);

            const [users, total] = await userRepository
                .createQueryBuilder("user")
                .where("user.money > :money", {money: 1000})
                .orderBy("user.money", "DESC")
                .skip(0)
                .take(5)
                .getManyAndCount();

            assert.ok(users.length > 0);
            assert.ok(total > 0);
            users.forEach(user => {
                assert.ok(user.money > 1000);
            });
        });

        test("should aggregate with pagination", async () => {
            const userRepository = dataSource.getRepository(User);

            const maxMoney = await userRepository
                .createQueryBuilder("user")
                .select("MAX(user.money)", "max")
                .getRawOne();

            assert.ok(maxMoney);
            assert.strictEqual(maxMoney.max, 2500); // User 25 * 100
        });
    });

    describe("Large Dataset Pagination", () => {
        test("should handle offset beyond dataset", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository.find({
                skip: 1000,
                take: 10,
            });

            assert.strictEqual(users.length, 0);
        });

        test("should calculate proper page count", async () => {
            const userRepository = dataSource.getRepository(User);
            const pageSize = 10;

            const total = await userRepository.count();
            const pageCount = Math.ceil(total / pageSize);

            assert.strictEqual(pageCount, 3);
        });

        test("should handle take=0", async () => {
            const userRepository = dataSource.getRepository(User);

            const users = await userRepository.find({
                skip: 0,
                take: 0,
            });

            // take: 0 typically means no limit, or returns empty
            assert.ok(Array.isArray(users));
        });
    });
});
