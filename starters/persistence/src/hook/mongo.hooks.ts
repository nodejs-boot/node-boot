import {MongoEntityManager, ObjectLiteral} from "typeorm";
import {MongoQueryRunner} from "typeorm/driver/mongodb/MongoQueryRunner";
import {Repository} from "typeorm/repository/Repository";
import {RepositoryType} from "../types";

/**
 * Retrieves the MongoDB client associated with a given TypeORM MongoRepository instance.
 *
 * @param repoInstance - An instance of a MongoRepository.
 * @returns The MongoClient instance used by the repository.
 * @throws Error if the function is called outside of a MongoRepository.
 */
export function useMongoClient(repoInstance: Repository<any>) {
    const queryRunner = repoInstance.queryRunner;
    const type = Reflect.getMetadata("custom:repotype", repoInstance);
    if (type === RepositoryType.MONGO && queryRunner) {
        // Retrieve the MongoClient instance from the TypeORM MongoDriver
        const mongoClient = (queryRunner as MongoQueryRunner).databaseConnection;
        if (mongoClient) {
            return mongoClient;
        }
    }
    throw new Error(`useMongoClient hook can only be used inside repositories extending MongoRepository`);
}

/**
 * Retrieves a MongoDB collection associated with a given TypeORM MongoRepository instance.
 *
 * @template C - The entity class type.
 * @param repoInstance - An instance of a MongoRepository.
 * @param collectionName - (Optional) The name of the collection to retrieve.
 * @returns The requested MongoDB Collection.
 * @throws Error if the function is called outside of a MongoRepository or if the collection cannot be determined.
 */
export function useMongoCollection<C extends ObjectLiteral>(repoInstance: Repository<any>, collectionName?: string) {
    // Check if the repository is an instance of MongoRepository
    const type = Reflect.getMetadata("custom:repotype", repoInstance);

    if (type === RepositoryType.MONGO && repoInstance.queryRunner) {
        // Get the database instance
        const mongoDatabase = (repoInstance.queryRunner as MongoQueryRunner).databaseConnection?.db();
        if (mongoDatabase) {
            return mongoDatabase.collection<C>(collectionName ?? repoInstance.metadata.tableName);
        }
    }
    throw new Error(`useMongoCollection function can only be used with instances of MongoRepository.`);
}

/**
 * Retrieves the Mongo EntityManager associated with a given TypeORM MongoRepository instance.
 *
 * @param repoInstance - An instance of a TypeORM MongoRepository.
 * @returns The EntityManager associated with the MongoRepository.
 * @throws Error if the repository instance is invalid.
 */
export function useMongoEntityManager(repoInstance: Repository<any>): MongoEntityManager {
    const type = Reflect.getMetadata("custom:repotype", repoInstance);
    if (type !== RepositoryType.MONGO) {
        throw new Error(`useMongoEntityManager hook can only be used inside a valid TypeORM MongoRepository`);
    }
    return repoInstance.manager as MongoEntityManager;
}

/**
 * Retrieves the MongoQueryRunner associated with a MongoDB repository.
 *
 * @param repoInstance - An instance of a TypeORM MongoRepository.
 * @returns The MongoQueryRunner associated with the repository.
 * @throws Error if the repository is not using a MongoQueryRunner.
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
