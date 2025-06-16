import {MongoEntityManager, ObjectLiteral, Repository} from "typeorm";
import {MongoQueryRunner} from "typeorm/driver/mongodb/MongoQueryRunner";
import {RepositoryType} from "../types";

/**
 * Retrieves the underlying `MongoClient` instance from a TypeORM `MongoRepository`.
 *
 * @param repoInstance - An instance of a MongoRepository.
 * @returns The `MongoClient` instance used by the repository.
 * @throws Error if used on a non-Mongo repository or if the client is not available.
 *
 * @example
 * ```ts
 * import {useMongoClient} from "@nodeboot/starter-persistence";
 *
 * const client = useMongoClient(this.mongoRepo);
 * const db = client.db("customDb");
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function useMongoClient(repoInstance: Repository<any>) {
    const queryRunner = repoInstance.queryRunner;
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type === RepositoryType.MONGO && queryRunner) {
        const mongoClient = (queryRunner as MongoQueryRunner).databaseConnection;
        if (mongoClient) {
            return mongoClient;
        }
    }

    throw new Error(`useMongoClient hook can only be used inside repositories extending MongoRepository`);
}

/**
 * Retrieves a MongoDB `Collection` from a TypeORM `MongoRepository`.
 *
 * @template C - Entity type of the collection.
 * @param repoInstance - An instance of a MongoRepository.
 * @param collectionName - Optional custom collection name; defaults to the repository’s metadata table name.
 * @returns The MongoDB collection instance.
 * @throws Error if used on a non-Mongo repository.
 *
 * @example
 * ```ts
 * import {useMongoCollection} from "@nodeboot/starter-persistence";
 *
 * const usersCollection = useMongoCollection<User>(this.mongoRepo, "users");
 * const user = await usersCollection.findOne({ email: "test@example.com" });
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function useMongoCollection<C extends ObjectLiteral>(repoInstance: Repository<any>, collectionName?: string) {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type === RepositoryType.MONGO && repoInstance.queryRunner) {
        const db = (repoInstance.queryRunner as MongoQueryRunner).databaseConnection?.db();
        if (db) {
            return db.collection<C>(collectionName ?? repoInstance.metadata.tableName);
        }
    }

    throw new Error(`useMongoCollection function can only be used with instances of MongoRepository.`);
}

/**
 * Retrieves the `MongoEntityManager` from a TypeORM `MongoRepository`.
 *
 * @param repoInstance - An instance of a MongoRepository.
 * @returns The associated `MongoEntityManager`.
 * @throws Error if used on a non-Mongo repository.
 *
 * @example
 * ```ts
 * import {useMongoEntityManager} from "@nodeboot/starter-persistence";
 *
 * const manager = useMongoEntityManager(this.mongoRepo);
 * await manager.find(User);
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function useMongoEntityManager(repoInstance: Repository<any>): MongoEntityManager {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type !== RepositoryType.MONGO) {
        throw new Error(`useMongoEntityManager hook can only be used inside a valid TypeORM MongoRepository`);
    }

    return repoInstance.manager as MongoEntityManager;
}

/**
 * Retrieves the `MongoQueryRunner` from a TypeORM `MongoRepository`.
 *
 * @param repoInstance - An instance of a MongoRepository.
 * @returns The associated `MongoQueryRunner`.
 * @throws Error if used on a non-Mongo repository.
 *
 * @example
 * ```ts
 * import {useMongoQueryRunner} from "@nodeboot/starter-persistence";
 *
 * const queryRunner = useMongoQueryRunner(this.mongoRepo);
 * await queryRunner.databaseConnection.db().collection("myCollection").insertOne({ key: "value" });
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function useMongoQueryRunner(repoInstance: Repository<any>): MongoQueryRunner {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type !== RepositoryType.MONGO) {
        throw new Error(
            `useMongoQueryRunner hook can only be used inside MongoDB repositories with an active MongoQueryRunner`,
        );
    }

    return repoInstance.queryRunner as MongoQueryRunner;
}
