import {MongoRepository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends MongoRepository<User> {}
