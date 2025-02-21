import {MongoRepository} from "typeorm";
import {DataRepository, useMongoClient, useMongoCollection} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends MongoRepository<User> {
    async findAllUsingCollection() {
        return useMongoCollection<User>(this, "users").find({}).toArray();
    }

    async findAllUsingClient() {
        return useMongoClient(this).db("facts").collection<User>("users").find({}).toArray();
    }
}
