import {Repository} from "typeorm";
import {DataRepository} from "@node-boot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends Repository<User> {}
